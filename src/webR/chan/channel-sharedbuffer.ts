import { AsyncQueue } from './queue';
import { promiseHandles, ResolveFn, newCrossOriginWorker, isCrossOrigin } from '../utils';
import { Message, newRequest, Response, SyncRequest } from './message';
import { Endpoint } from './task-common';
import { syncResponse } from './task-main';
import { ChannelType, ChannelMain, ChannelWorker } from './channel';

import { IN_NODE } from '../compat';
import type { Worker as NodeWorker } from 'worker_threads';
if (IN_NODE) {
  (globalThis as any).Worker = require('worker_threads').Worker as NodeWorker;
}

// Main ----------------------------------------------------------------

export class SharedBufferChannelMain implements ChannelMain {
  inputQueue = new AsyncQueue<Message>();
  outputQueue = new AsyncQueue<Message>();
  #interruptBuffer?: Int32Array;

  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;
  close = () => {};

  #parked = new Map<string, ResolveFn>();

  constructor(url: string, config: unknown) {
    const initWorker = (worker: Worker) => {
      this.#handleEventsFromWorker(worker);
      this.close = () => worker.terminate();
      const msg = {
        type: 'init',
        data: { config, channelType: ChannelType.SharedArrayBuffer },
      } as Message;
      worker.postMessage(msg);
    };

    if (isCrossOrigin(url)) {
      newCrossOriginWorker(url, (worker: Worker) => initWorker(worker));
    } else {
      const worker = new Worker(url);
      initWorker(worker);
    }

    ({ resolve: this.resolve, promise: this.initialised } = promiseHandles());
  }

  async read() {
    return await this.outputQueue.get();
  }

  async flush() {
    const msg: Message[] = [];
    while (!this.outputQueue.isEmpty()) {
      msg.push(await this.read());
    }
    return msg;
  }

  interrupt() {
    if (!this.#interruptBuffer) {
      throw new Error('Failed attempt to interrupt before initialising interruptBuffer');
    }
    this.#interruptBuffer[0] = 1;
  }

  write(msg: Message) {
    this.inputQueue.put(msg);
  }

  async request(msg: Message, transferables?: [Transferable]): Promise<any> {
    const req = newRequest(msg, transferables);

    const { resolve: resolve, promise: prom } = promiseHandles();
    this.#parked.set(req.data.uuid, resolve);

    this.write(req);
    return prom;
  }

  #resolveResponse(msg: Response) {
    const uuid = msg.data.uuid;
    const resolve = this.#parked.get(uuid);

    if (resolve) {
      this.#parked.delete(uuid);
      resolve(msg.data.resp);
    } else {
      console.warn("Can't find request.");
    }
  }

  #handleEventsFromWorker(worker: Worker) {
    if (IN_NODE) {
      (worker as unknown as NodeWorker).on('message', (message: Message) => {
        this.#onMessageFromWorker(worker, message);
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
        this.#resolveResponse(message as Response);
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
            // TODO: Pass a `replacer` function
            await syncResponse(worker, reqData, response);
            break;
          }
          default:
            throw new TypeError(`Unsupported request type '${payload.type}'.`);
        }
        return;
      }
      case 'request':
        throw new TypeError(
          "Can't send messages of type 'request' from a worker. Please Use 'sync-request' instead."
        );
    }
  };
}

// Worker --------------------------------------------------------------

import { SyncTask, setInterruptHandler, setInterruptBuffer } from './task-worker';
import { Module as _Module } from '../module';

declare let Module: _Module;
// callMain function readied by Emscripten
declare let callMain: (args: string[]) => void;

export class SharedBufferChannelWorker implements ChannelWorker {
  #ep: Endpoint;
  #dispatch: (msg: Message) => void = () => 0;
  #interruptBuffer = new Int32Array(new SharedArrayBuffer(4));
  #interrupt = () => {};

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

  read(): Message {
    const msg = { type: 'read' } as Message;
    const task = new SyncTask(this.#ep, msg);
    return task.syncify() as Message;
  }

  inputOrDispatch(): number {
    for (;;) {
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
