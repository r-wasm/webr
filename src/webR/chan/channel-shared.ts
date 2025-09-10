import { promiseHandles, newCrossOriginWorker, isCrossOrigin } from '../utils';
import { EventMessage, Message, Response, SyncRequest, WebSocketCloseMessage, WebSocketMessage, WebSocketOpenMessage, WorkerErrorMessage, WorkerMessage, WorkerMessageErrorMessage } from './message';
import { Endpoint } from './task-common';
import { syncResponse } from './task-main';
import { ChannelMain, ChannelWorker } from './channel';
import { ChannelType } from './channel-common';
import { WebROptions } from '../webr-main';
import { WebRChannelError, WebRWorkerError } from '../error';

import { IN_NODE } from '../compat';
import type { Worker as NodeWorker } from 'worker_threads';
if (IN_NODE) {
  (globalThis as any).Worker = require('worker_threads').Worker as NodeWorker;
}

// Main ----------------------------------------------------------------

export class SharedBufferChannelMain extends ChannelMain {
  #eventBuffer?: Int32Array;

  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;
  reject: (message: string | Error) => void;
  close = () => { return; };

  constructor(config: Required<WebROptions>) {
    super();
    ({ resolve: this.resolve, reject: this.reject, promise: this.initialised } = promiseHandles());

    const initWorker = (worker: Worker) => {
      this.#handleEventsFromWorker(worker);
      this.close = () => {
        worker.terminate();
        this.putClosedMessage();
      };
      const msg = {
        type: 'init',
        data: { config, channelType: ChannelType.SharedArrayBuffer },
      } as Message;
      worker.postMessage(msg);
    };

    if (isCrossOrigin(config.baseUrl)) {
      newCrossOriginWorker(
        `${config.baseUrl}webr-worker.js`,
        (worker: Worker) => initWorker(worker),
        (error: Error) => {
          this.reject(new WebRWorkerError(`Worker loading error: ${error.message}`));
        }
      );
    } else {
      const worker = new Worker(`${config.baseUrl}webr-worker.js`);
      initWorker(worker);
    }
  }

  emit(msg: Message): void {
    if (!this.#eventBuffer) {
      throw new WebRChannelError('Failed attempt to interrupt before initialising interruptBuffer');
    }
    this.eventQueue.push({ type: 'event', data: { msg } });
    this.#eventBuffer[0] = 1;
  }

  interrupt() {
    this.inputQueue.reset();
    this.emit({ type: 'interrupt' });
  }

  #handleEventsFromWorker(worker: Worker) {
    if (IN_NODE) {
      (worker as unknown as NodeWorker).on('message', (message: Message) => {
        void this.#onMessageFromWorker(worker, message);
      });
      (worker as unknown as NodeWorker).on('error', (ev: Event) => {
        console.error(ev);
        this.reject(new WebRWorkerError(
          "An error occurred initialising the webR SharedBufferChannel worker."
        ));
      });
    } else {
      worker.onmessage = (ev: MessageEvent) =>
        this.#onMessageFromWorker(worker, ev.data as Message);
      worker.onerror = (ev) => {
        console.error(ev);
        this.reject(new WebRWorkerError(
          "An error occurred initialising the webR SharedBufferChannel worker."
        ));
      };
    }
  }

  #onMessageFromWorker = async (worker: Worker, message: Message) => {
    if (!message || !message.type) {
      return;
    }

    switch (message.type) {
      case 'resolve':
        this.#eventBuffer = new Int32Array(message.data as SharedArrayBuffer);
        this.resolve();
        return;

      case 'response':
        this.resolveResponse(message as Response);
        return;

      case 'system':
        this.systemQueue.put(message.data as Message);
        return;

      default:
        this.outputQueue.put(message);
        return;

      case 'sync-request': {
        const msg = message as SyncRequest;
        const payload = msg.data.msg;
        const reqData = msg.data.reqData;

        switch (payload.type) {
          case 'read': {
            const response = await this.inputQueue.get();
            await syncResponse(worker, reqData, response);
            break;
          }
          case 'event': {
            const response = this.eventQueue.shift();
            await syncResponse(worker, reqData, response);
            break;
          }
          case 'eval-await': {
            const src = payload.data as string;
            const data = {} as { result?: any; error?: string };
            try {
              data.result = await (0, eval)(src) as unknown;
              if (typeof data.result === 'function') {
                // Don't try to transfer a function back to the worker thread
                data.result = String(data.result);
              }
            } catch (_error) {
              const error = _error as Error;
              data.error = error.message;
            }
            await syncResponse(worker, reqData, { type: 'eval-response', data });
            break;
          }
          default:
            throw new WebRChannelError(`Unsupported request type '${payload.type}'.`);
        }
        return;
      }
      case 'request':
        throw new WebRChannelError(
          "Can't send messages of type 'request' from a worker. Please Use 'sync-request' instead."
        );
    }
  };
}

// Worker --------------------------------------------------------------

import { setEventBuffer, setEventsHandler, SyncTask } from './task-worker';
import { Module } from '../emscripten';
import { WebSocketProxy, WebSocketProxyFactory } from './proxy-websocket';
import { WorkerProxy, WorkerProxyFactory } from './proxy-worker';

export class SharedBufferChannelWorker implements ChannelWorker {
  WebSocketProxy: typeof WebSocket;
  WorkerProxy: typeof Worker;
  ws: Map<string, WebSocketProxy>;
  workers: Map<string, WorkerProxy>;
  #ep: Endpoint;
  #dispatch: (msg: Message) => void = () => 0;
  #eventBuffer = new Int32Array(new SharedArrayBuffer(4));
  #interrupt = () => { return; };
  resolveRequest: (msg: Message) => void = () => { return; };

  constructor() {
    this.#ep = (IN_NODE ? require('worker_threads').parentPort : globalThis) as Endpoint;
    setEventBuffer(this.#eventBuffer.buffer);
    setEventsHandler(() => this.handleEvents());

    // Event functionality to be handled via proxy to main thread
    this.WebSocketProxy = WebSocketProxyFactory.proxy(this);
    this.ws = new Map();
    this.WorkerProxy = WorkerProxyFactory.proxy(this);
    this.workers = new Map();
  }

  resolve() {
    this.write({ type: 'resolve', data: this.#eventBuffer.buffer });
  }

  write(msg: Message, transfer?: Transferable[]) {
    this.#ep.postMessage(msg, transfer);
  }

  writeSystem(msg: Message, transfer?: Transferable[]) {
    this.#ep.postMessage({ type: 'system', data: msg }, transfer);
  }

  syncRequest(msg: Message, transfer?: Transferable[]): Message {
    const task = new SyncTask(this.#ep, msg, transfer);
    return task.syncify() as Message;
  }

  read(): Message {
    return this.syncRequest({ type: 'read' });
  }

  inputOrDispatch(): number {
    for (; ;) {
      const msg = this.read();
      if (msg.type === 'stdin') {
        return Module.allocateUTF8(msg.data as string);
      }
      this.#dispatch(msg);
    }
  }

  run(args: string[]) {
    try {
      Module.callMain(args);
    } catch (e) {
      if (e instanceof WebAssembly.RuntimeError) {
        this.writeSystem({ type: 'console.error', data: e.message });
        this.writeSystem({
          type: 'console.error',
          data: "An unrecoverable WebAssembly error has occurred, the webR worker will be closed.",
        });
        this.writeSystem({ type: 'close' });
      }
      throw e;
    }
  }

  handleEvents() {
    if (this.#eventBuffer[0] !== 0) {
      for (; ;) {
        const response = this.syncRequest({ type: 'event' }) as EventMessage | undefined;
        if (!response) break;
        switch (response.data.msg.type) {
          case 'interrupt':
            this.#interrupt();
            break;
          case 'websocket-open': {
            const message = response.data.msg as WebSocketOpenMessage;
            this.ws.get(message.data.uuid)?._accept();
            break;
          }
          case 'websocket-message': {
            const message = response.data.msg as WebSocketMessage;
            this.ws.get(message.data.uuid)?._recieve(message.data.data);
            break;
          }
          case 'websocket-close': {
            const message = response.data.msg as WebSocketCloseMessage;
            this.ws.get(message.data.uuid)?._close(message.data.code, message.data.reason);
            break;
          }
          case 'websocket-error': {
            const message = response.data.msg as WebSocketMessage;
            this.ws.get(message.data.uuid)?._error();
            break;
          }
          case 'worker-message': {
            const message = response.data.msg as WorkerMessage;
            this.workers.get(message.data.uuid)?._message(message.data.data);
            break;
          }
          case 'worker-messageerror': {
            const message = response.data.msg as WorkerMessageErrorMessage;
            this.workers.get(message.data.uuid)?._messageerror(message.data.data);
            break;
          }
          case 'worker-error': {
            const message = response.data.msg as WorkerErrorMessage;
            this.workers.get(message.data.uuid)?._error();
            break;
          }
          default:
            throw new Error(`Unsupported event type '${response.data.msg.type}'.`);
        }
      }
      this.#eventBuffer[0] = 0;
    }
  }

  setInterrupt(interrupt: () => void) {
    this.#interrupt = interrupt;
  }

  setDispatchHandler(dispatch: (msg: Message) => void) {
    this.#dispatch = dispatch;
  }
}
