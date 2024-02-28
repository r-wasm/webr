import { promiseHandles, newCrossOriginWorker, isCrossOrigin } from '../utils';
import { Message, Response, SyncRequest } from './message';
import { Endpoint } from './task-common';
import { syncResponse } from './task-main';
import { ChannelMain, ChannelWorker } from './channel';
import { ChannelType } from './channel-common';
import { WebROptions } from '../webr-main';
import { WebRChannelError } from '../error';

import { IN_NODE } from '../compat';
import type { Worker as NodeWorker } from 'worker_threads';
if (IN_NODE) {
  (globalThis as any).Worker = require('worker_threads').Worker as NodeWorker;
}

// Main ----------------------------------------------------------------

export class SharedBufferChannelMain extends ChannelMain {
  #interruptBuffer?: Int32Array;

  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;
  close = () => { return; };

  constructor(config: Required<WebROptions>) {
    super();
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
      newCrossOriginWorker(`${config.baseUrl}webr-worker.js`, (worker: Worker) =>
        initWorker(worker)
      );
    } else {
      const worker = new Worker(`${config.baseUrl}webr-worker.js`);
      initWorker(worker);
    }

    ({ resolve: this.resolve, promise: this.initialised } = promiseHandles());
  }

  interrupt() {
    if (!this.#interruptBuffer) {
      throw new WebRChannelError('Failed attempt to interrupt before initialising interruptBuffer');
    }
    this.inputQueue.reset();
    this.#interruptBuffer[0] = 1;
  }

  #handleEventsFromWorker(worker: Worker) {
    if (IN_NODE) {
      (worker as unknown as NodeWorker).on('message', (message: Message) => {
        void this.#onMessageFromWorker(worker, message);
      });
    } else {
      worker.onmessage = (ev: MessageEvent) =>
        this.#onMessageFromWorker(worker, ev.data as Message);
    }
  }

  #onMessageFromWorker = async (worker: Worker, message: Message) => {
    if (!message || !message.type) {
      return;
    }

    switch (message.type) {
      case 'resolve':
        this.#interruptBuffer = new Int32Array(message.data as SharedArrayBuffer);
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

import { SyncTask, setInterruptHandler, setInterruptBuffer } from './task-worker';
import { Module } from '../emscripten';

export class SharedBufferChannelWorker implements ChannelWorker {
  #ep: Endpoint;
  #dispatch: (msg: Message) => void = () => 0;
  #interruptBuffer = new Int32Array(new SharedArrayBuffer(4));
  #interrupt = () => { return; };
  onMessageFromMainThread: (msg: Message) => void = () => { return; };

  constructor() {
    this.#ep = (IN_NODE ? require('worker_threads').parentPort : globalThis) as Endpoint;
    setInterruptBuffer(this.#interruptBuffer.buffer);
    setInterruptHandler(() => this.handleInterrupt());
  }

  resolve() {
    this.write({ type: 'resolve', data: this.#interruptBuffer.buffer });
  }

  write(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage(msg, transfer);
  }

  writeSystem(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage({ type: 'system', data: msg }, transfer);
  }

  read(): Message {
    const msg = { type: 'read' } as Message;
    const task = new SyncTask(this.#ep, msg);
    return task.syncify() as Message;
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
    Module.callMain(args);
  }

  setInterrupt(interrupt: () => void) {
    this.#interrupt = interrupt;
  }

  handleInterrupt() {
    if (this.#interruptBuffer[0] !== 0) {
      this.#interruptBuffer[0] = 0;
      this.#interrupt();
    }
  }

  setDispatchHandler(dispatch: (msg: Message) => void) {
    this.#dispatch = dispatch;
  }
}
