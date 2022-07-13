import { AsyncQueue } from './queue';
import { promiseHandles, ResolveFn } from '../utils';
import { Message,
         newRequest,
         Response,
         SyncRequest } from './message';
import { Endpoint } from './task-common';
import { syncResponse } from './task-main';


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

  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;

  #parked = new Map<string, ResolveFn>();

  constructor(url: string, data: any) {
    let worker = new Worker(url);

    this.#handleEventsFromWorker(worker);

    let msg = { type: 'init', data: data } as Message;
    worker.postMessage(msg);

    ({ resolve: this.resolve, promise: this.initialised } = promiseHandles());
  }

  async read() {
    while (true) {
      let msg = await this.outputQueue.get();

      if (msg.type === 'response') {
        this.#resolveResponse(msg as Response);
        continue;
      }

      return msg;
    }
  }

  write(msg: Message) {
    this.inputQueue.put(msg);
  }

  async request(msg: Message,
                transferables?: [Transferable]): Promise<any> {
    let req = newRequest(msg, transferables);

    let { resolve: resolve, promise: prom } = promiseHandles();
    this.#parked.set(req.data.uuid, resolve);

    this.write(req);
    return prom;
  }

  #resolveResponse(msg: Response) {
    let uuid = msg.data.uuid;
    let resolve = this.#parked.get(uuid);

    if (resolve) {
      this.#parked.delete(uuid)
      resolve(msg.data.resp);
    } else {
      console.warn("Can't find request.");
    }
  }

  #handleEventsFromWorker(worker: Worker) {
    let main = this;

    worker.onmessage = async function callback(ev: MessageEvent) {
      if (!ev || !ev.data || !ev.data.type) {
        return;
      }

      switch (ev.data.type) {
        case 'resolve':
          main.resolve();
          return;

        default:
          main.outputQueue.put(ev.data);
          return;

        case 'sync-request':
          let msg = ev.data as SyncRequest;
          let payload = msg.data.msg;
          let reqData = msg.data.reqData;

          if (payload.type != 'read') {
            throw `Unsupported request type '$(payload.type)'.`;
          }

          let response = await main.inputQueue.get();

          // TODO: Pass a `replacer` function
          await syncResponse(worker, reqData, response);
          return;

        case 'request':
          throw `
            Can't send messages of type 'request' from a worker.
            Please Use 'sync-request' instead.
          `
      }
    } as any;
  }
}


// Worker --------------------------------------------------------------

import { SyncTask } from './task-worker'

export class ChannelWorker {
  #ep: Endpoint = self as any;

  resolve() {
    this.write({ type: 'resolve' });
  };

  write(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage(msg, transfer);
  }

  read(): Message {
    let msg = { type: 'read' } as Message;
    let task = new SyncTask(this.#ep, msg);
    return task.syncify();
  };
}
