import { promiseHandles, ResolveFn, RejectFn } from '../utils';
import { AsyncQueue } from './queue';
import { Message, newRequest, Response } from './message';
import { WebRPayload, WebRPayloadWorker, webRPayloadError } from '../payload';

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

export abstract class ChannelMain {
  inputQueue = new AsyncQueue<Message>();
  outputQueue = new AsyncQueue<Message>();

  #parked = new Map<string, { resolve: ResolveFn; reject: RejectFn }>();

  abstract initialised: Promise<unknown>;
  abstract close(): void;
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

  write(msg: Message): void {
    this.inputQueue.put(msg);
  }

  async request(msg: Message, transferables?: [Transferable]): Promise<WebRPayload> {
    const req = newRequest(msg, transferables);

    const { resolve, reject, promise } = promiseHandles();
    this.#parked.set(req.data.uuid, { resolve, reject });

    this.write(req);
    return promise as Promise<WebRPayload>;
  }

  protected resolveResponse(msg: Response) {
    const uuid = msg.data.uuid;
    const handles = this.#parked.get(uuid);

    if (handles) {
      const payload = msg.data.resp as WebRPayloadWorker;
      this.#parked.delete(uuid);

      if (payload.payloadType === 'err') {
        handles.reject(webRPayloadError(payload));
      } else {
        handles.resolve(payload);
      }
    } else {
      console.warn("Can't find request.");
    }
  }
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
