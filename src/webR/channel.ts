import { AsyncQueue } from './queue';
import { promiseHandles, ResolveFn } from './utils';
import * as Synclink from 'synclink';
import { Message,
         newRequest,
         Response,
         SyncRequest } from './message';

// FIXME: Why doesn't this work?
// import { SynclinkTask } from 'synclink/task';
import { SynclinkTask } from '../node_modules/synclink/dist/esm/task';


// The channel structure is asymetric:
//
// - The main thread "writes" to the input queue and "reads"
//   asynchronously from the output queue (typically in an async
//   infloop).
//
// - The worker synchronously "recvs" from the input queue and "sends"
//   to the output queue. Receiving a message blocks until an input is
//   available. Sending a message returns at the next tick of the main thread's
//   event loop.


// Main ----------------------------------------------------------------

export class ChannelMain {
  inputQueue = new AsyncQueue<Message>();
  outputQueue = new AsyncQueue<Message>();

  // TODO: `connect()` method that takes a worker script and returns a
  // promise that resolves upon initialisation. Once done, the channel
  // owns the worker and all communication goes through here.
  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;

  #parked = new Map<string, ResolveFn>();

  constructor() {
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
}


// Worker --------------------------------------------------------------

export interface ChannelWorkerIface {
  resolve(): void;
  read(): Promise<Message>;
  write(msg: Message): void;
}

export type ChannelWorkerProxy = Synclink.Remote<ChannelWorkerIface>;

export class ChannelWorker {
  proxy: ChannelWorkerIface;

  constructor(proxy: ChannelWorkerIface) {
    this.proxy = proxy;
  }

  resolve() {
    (this.proxy.resolve() as unknown as SynclinkTask).syncify();
  };

  read(): Message {
    return (this.proxy.read() as unknown as SynclinkTask).syncify();
  };

  write(msg: Message) {
    (this.proxy.write(msg) as unknown as SynclinkTask).syncify();
  };
}

// Pass this to the worker via Synclink. This is eventually
// transformed by Synclink to a `Synclink.Remote<ChannelWorkerIface>`.
export function chanWorkerHandle(main: ChannelMain) {
  return Synclink.proxy({
    resolve() {
      main.resolve();
    },
    async read() {
      return await main.inputQueue.get();
    },
    write(msg: Message) {
      main.outputQueue.put(msg);
    }
  })
}

import { Endpoint } from './task-common';
import { syncResponse } from './task-main';

const msgTypes = ['resolve', 'message', 'request', 'response', 'sync-request'];

function handleEventsMain(main: ChannelMain, ep: Endpoint = self as any) {
  ep.addEventListener("message", async function callback(ev: MessageEvent) {
    if (!ev || !ev.data || !ev.data.type || !msgTypes.includes(ev.data.type)) {
      return;
    }

    switch (ev.data.type) {
      case 'resolve':
        main.resolve();
        return;

      case 'message':
      case 'response':
        main.outputQueue.put(ev.data);
        return;

      case 'sync-request':
        let msg = ev.data as SyncRequest;
        let payload = msg.data.msg;
        let reqData = msg.data.reqData;

        if (payload.type != 'read') {
          throw `Unsupported request type '$(payload.type)'.`;
        }

        let response = await main.inputQueue.get();;

        // TODO: Pass a `replacer` function
        syncResponse(ep, reqData, response);
        return;

      case 'request':
        throw `
          Can't send messages of type 'request' from a worker.
          Please Use 'sync-request' instead.
        `
    }
  } as any);
}

// export function handleEventsWorker(ep: Endpoint = self as any) {
//   ep.addEventListener("message", function callback(ev: MessageEvent) {
//   } as any);
// }
