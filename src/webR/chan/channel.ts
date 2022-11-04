import { Message } from './message';
import { SharedBufferChannelMain, SharedBufferChannelWorker } from './channel-shared';
import { ServiceWorkerChannelMain, ServiceWorkerChannelWorker } from './channel-service';
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
  Automatic,
  SharedArrayBuffer,
  ServiceWorker,
  PostMessage,
}

export type ChannelInitMessage = {
  type: string;
  data: {
    config: Required<WebROptions>;
    channelType: Exclude<ChannelType, ChannelType.Automatic>;
    clientId?: string;
  };
};

export function newChannelMain(data: Required<WebROptions>) {
  switch (data.channelType) {
    case ChannelType.SharedArrayBuffer:
      return new SharedBufferChannelMain(data);
    case ChannelType.ServiceWorker:
      return new ServiceWorkerChannelMain(data);
    case ChannelType.Automatic:
    default:
      if (IN_NODE || crossOriginIsolated) {
        return new SharedBufferChannelMain(data);
      }
      /*
       * TODO: If we are not cross-origin isolated but we can still use service
       * workers, we could setup a service worker to inject the relevant headers
       * to enable cross-origin isolation.
       */
      if ('serviceWorker' in navigator && !isCrossOrigin(data.SW_URL)) {
        return new ServiceWorkerChannelMain(data);
      }
      throw new Error('Unable to initialise main thread communication channel');
  }
}

export function newChannelWorker(msg: ChannelInitMessage) {
  switch (msg.data.channelType) {
    case ChannelType.SharedArrayBuffer:
      return new SharedBufferChannelWorker();
    case ChannelType.ServiceWorker:
      return new ServiceWorkerChannelWorker(msg.data.clientId);
    default:
      throw new Error('Unknown worker channel type recieved');
  }
}
