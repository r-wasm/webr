import { AsyncQueue } from './queue';
import { promiseHandles } from './utils';
import * as Synclink from 'synclink';

// FIXME: Why doesn't this work?
// import { SynclinkTask } from 'synclink/task';
import { SynclinkTask } from '../node_modules/synclink/dist/esm/task';


export type Message = {
  type: string;
  data?: any;
};


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

  constructor() {
    ({ resolve: this.resolve, promise: this.initialised } = promiseHandles());
  }

  async recv() {
    return await this.outputQueue.get()
  }
  send(msg: Message) {
    this.inputQueue.put(msg);
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
