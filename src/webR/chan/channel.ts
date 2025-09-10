/**
 * Interfaces for the webR main and worker thread communication channels.
 * @module Channel
 */

import { promiseHandles, ResolveFn, RejectFn } from '../utils';
import { AsyncQueue } from './queue';
import { EventMessage, Message, newRequest, Response } from './message';
import { WebRPayload, WebRPayloadWorker, webRPayloadAsError } from '../payload';
import { WebRChannelError } from '../error';

// The channel structure is asymmetric:
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

export abstract class ChannelMain {
  inputQueue = new AsyncQueue<Message>();
  outputQueue = new AsyncQueue<Message>();
  systemQueue = new AsyncQueue<Message>();
  eventQueue = new Array<EventMessage>;

  #parked = new Map<string, { resolve: ResolveFn<any>; reject: RejectFn }>();
  #closed = false;

  abstract initialised: Promise<unknown>;
  abstract close(): void;
  abstract emit(msg: Message): void;
  abstract interrupt(): void;

  async read(): Promise<Message> {
    return await this.outputQueue.get();
  }

  async flush(): Promise<Message[]> {
    const msg: Message[] = [];
    while (!this.outputQueue.isEmpty()) {
      msg.push(await this.read());
    }
    return msg;
  }

  async readSystem(): Promise<Message> {
    return await this.systemQueue.get();
  }

  write(msg: Message): void {
    if (this.#closed) {
      throw new WebRChannelError("The webR communication channel has been closed.");
    }
    this.inputQueue.put(msg);
  }

  async request(msg: Message, transferables?: [Transferable]): Promise<WebRPayload> {
    const req = newRequest(msg, transferables);

    const { resolve, reject, promise } = promiseHandles<WebRPayload>();
    this.#parked.set(req.data.uuid, { resolve, reject });

    this.write(req);
    return promise;
  }

  protected putClosedMessage(): void {
    this.#closed = true;
    this.outputQueue.put({ type: 'closed' });
  }

  protected resolveResponse(msg: Response) {
    const uuid = msg.data.uuid;
    const handles = this.#parked.get(uuid);

    if (handles) {
      const payload = msg.data.resp.data as WebRPayloadWorker;
      this.#parked.delete(uuid);

      if (payload.payloadType === 'err') {
        handles.reject(webRPayloadAsError(payload));
      } else {
        handles.resolve(payload);
      }
    } else {
      console.warn("Can't find request.");
    }
  }
}

export interface ChannelWorker {
  WebSocketProxy: typeof WebSocket;
  WorkerProxy: typeof Worker;
  resolve(): void;
  write(msg: Message, transfer?: [Transferable]): void;
  writeSystem(msg: Message, transfer?: [Transferable]): void;
  syncRequest(msg: Message, transfer?: [Transferable]): Message;
  read(): Message;
  handleEvents(): void;
  setInterrupt(interrupt: () => void): void;
  run(args: string[]): void;
  inputOrDispatch: () => number;
  setDispatchHandler: (dispatch: (msg: Message) => void) => void;
  resolveRequest: (msg: Message) => void;
}

/**
 * Handler functions dealing with setup and communication over a Service Worker.
 */
export interface ServiceWorkerHandlers {
  handleActivate: (this: ServiceWorkerGlobalScope, ev: ExtendableEvent) => any;
  handleFetch: (this: ServiceWorkerGlobalScope, ev: FetchEvent) => any;
  handleInstall: (this: ServiceWorkerGlobalScope, ev: ExtendableEvent) => any;
  handleMessage: (this: ServiceWorkerGlobalScope, ev: ExtendableMessageEvent) => any;
}
