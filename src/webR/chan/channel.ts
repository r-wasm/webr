import { Message } from './message';
import { SharedBufferChannelMain, SharedBufferChannelWorker } from './channel-sharedbuffer';
import { ServiceWorkerChannelMain, ServiceWorkerChannelWorker } from './channel-serviceworker';
import { WebROptions } from '../webr-main';
import { isCrossOrigin } from '../utils';
import { IN_NODE } from '../compat';

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

export interface ChannelMain {
  initialised: Promise<unknown>;
  close(): void;
  read(): Promise<Message>;
  flush(): Promise<Message[]>;
  write(msg: Message): void;
  request(msg: Message, transferables?: [Transferable]): Promise<any>;
  interrupt(): void;
}

export interface ChannelWorker {
  resolve(): void;
  write(msg: Message, transfer?: [Transferable]): void;
  read(): Message;
  handleInterrupt(): void;
  setInterrupt(interrupt: () => void): void;
  run(args: string[]): void;
  inputOrDispatch: () => number;
  setDispatchHandler: (dispatch: (msg: Message) => void) => void;
}

export enum ChannelType {
  SharedArrayBuffer,
  ServiceWorker,
  PostMessage,
}

export function newChannelMain(url: string, data: Required<WebROptions>) {
  if (IN_NODE || crossOriginIsolated) {
    return new SharedBufferChannelMain(url, data);
  }
  if ('serviceWorker' in navigator && !isCrossOrigin(url)) {
    return new ServiceWorkerChannelMain(url, data);
  }
  throw new Error('Unable to initialise main thread communication channel');
}

export function newChannelWorker(channelType: ChannelType) {
  switch (channelType) {
    case ChannelType.SharedArrayBuffer:
      return new SharedBufferChannelWorker();
    case ChannelType.ServiceWorker:
      return new ServiceWorkerChannelWorker();
    default:
      throw new Error('Unknown worker channel type recieved');
  }
}
