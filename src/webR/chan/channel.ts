import { AsyncQueue } from './queue';
import { promiseHandles, ResolveFn } from '../utils';
import { Message, newRequest, Response, SyncRequest } from './message';
import { Endpoint } from './task-common';
import { syncResponse } from './task-main';

import { IN_NODE } from '../compat';
import type { Worker as NodeWorker } from 'worker_threads';
if (IN_NODE) {
  (globalThis as any).Worker = require('worker_threads').Worker as NodeWorker;
}

// The channel structure is asymetric:
//
// - The main thread maintains the input and output queues. All
//   messages sent from main are stored in the input queue. The input
//   queue is pull-based, it's the worker that initiates a transfer
//   via a sync-request.
//
//   The output queue is filled at the initiative of the worker. The
//   main thread asynchronously reads from this queue, typically in an
//   async infloop.
//
// - The worker synchronously reads from the input queue. Reading a
//   message blocks until an input is available. Writing a message to
//   the output queue is equivalent to calling `postMessage()` and
//   returns immediately.
//
//   Note that the messages sent from main to worker need to be
//   serialised. There is no structured cloning involved, and
//   ArrayBuffers can't be transferred, only copied.

// Main ----------------------------------------------------------------

export class ChannelMain {
  inputQueue = new AsyncQueue<Message>();
  outputQueue = new AsyncQueue<Message>();
  userBreakSignal = 0;

  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;
  close = () => {};

  #parked = new Map<string, ResolveFn>();

  constructor(url: string, data: unknown) {
    const initWorker = (worker: Worker) => {
      this.#handleEventsFromWorker(worker);
      this.close = () => worker.terminate();
      const msg = { type: 'init', data: data } as Message;
      worker.postMessage(msg);
    };

    if (url.startsWith('http')) {
      /* Workaround for loading a cross-origin script.
       *
       * When fetching a worker script, the fetch is required by the spec to
       * use "same-origin" mode. This is to avoid loading a worker with a
       * cross-origin global scope, which can allow for a cross-origin
       * restriction bypass.
       *
       * When the fetch URL begins with 'http', we assume the request is
       * cross-origin. We download the content of the URL using a XHR first,
       * create a blob URL containing the requested content, then load the
       * blob URL as a script.
       *
       * The origin of a blob URL is the same as that of the environment that
       * created the URL, and so the global scope of the resulting worker is
       * no longer cross-origin. In that case, the cross-origin restriction
       * bypass is not possible, and the script is permitted to be loaded.
       */
      const req = new XMLHttpRequest();
      req.open('get', url, true);
      req.onload = () => {
        const worker = new Worker(URL.createObjectURL(new Blob([req.responseText])));
        initWorker(worker);
      };
      req.send();
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
          case 'userBreakSignal': {
            await syncResponse(worker, reqData, this.userBreakSignal);
            this.userBreakSignal = 0;
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

import { SyncTask } from './task-worker';

export class ChannelWorker {
  #ep: Endpoint;

  constructor() {
    this.#ep = (IN_NODE ? require('worker_threads').parentPort : globalThis) as Endpoint;
  }

  resolve() {
    this.write({ type: 'resolve' });
  }

  write(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage(msg, transfer);
  }

  read(): Message {
    const msg = { type: 'read' } as Message;
    const task = new SyncTask(this.#ep, msg);
    return task.syncify() as Message;
  }

  userBreakSignal(): number {
    const task = new SyncTask(this.#ep, { type: 'userBreakSignal' });
    return task.syncify() as number;
  }
}
