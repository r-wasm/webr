import { AsyncQueue } from './queue';
import { promiseHandles, ResolveFn } from '../utils';
import { Message, newRequest, Response, Request, newResponse } from './message';
import { Endpoint } from './task-common';
import { ChannelType } from './channel';
import { WebROptions } from '../webr-main';

import { IN_NODE } from '../compat';
import type { Worker as NodeWorker } from 'worker_threads';
if (IN_NODE) {
  (globalThis as any).Worker = require('worker_threads').Worker as NodeWorker;
}

// Main ----------------------------------------------------------------

export class ServiceWorkerChannelMain {
  inputQueue = new AsyncQueue<Message>();
  outputQueue = new AsyncQueue<Message>();

  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;
  close = () => {};

  #parked = new Map<string, ResolveFn>();
  #registration?: ServiceWorkerRegistration;

  constructor(url: string, config: Required<WebROptions>) {
    const worker = new Worker(url);

    this.#registerServiceWorker(`${config.WEBR_URL}serviceworker.js`);
    this.#handleEventsFromWorker(worker);
    this.close = () => worker.terminate();
    const msg = {
      type: 'init',
      data: { config, channelType: ChannelType.ServiceWorker },
    } as Message;
    worker.postMessage(msg);

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

  interrupt() {}

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

  async #registerServiceWorker(url: string): Promise<string> {
    // Register service worker
    this.#registration = await navigator.serviceWorker.register(url);
    await navigator.serviceWorker.ready;
    window.addEventListener('beforeunload', () => {
      this.#registration?.unregister();
    });

    // Ensure we can communicate with service worker and we have a client ID
    const clientID = await new Promise<string>((resolve) => {
      navigator.serviceWorker.addEventListener(
        'message',
        function listener(event: MessageEvent<{ type: string; clientId: string }>) {
          if (event.data.type === 'registration-successful') {
            navigator.serviceWorker.removeEventListener('message', listener);
            resolve(event.data.clientId);
          }
        }
      );
      if (!this.#registration?.active) {
        throw new Error("Can't respond to service worker, no active registration.");
      }
      this.#registration?.active.postMessage({ type: 'register-client-main' });
    });

    // Setup listener for service worker messages
    navigator.serviceWorker.addEventListener(
      'message',
      (event: MessageEvent<{ type: string; url: string; msg: Request; uuid: string }>) => {
        this.#onMessageFromServiceWorker(event);
      }
    );

    return clientID;
  }

  async #onMessageFromServiceWorker(
    event: MessageEvent<{ type: string; url: string; msg: Message; uuid: string }>
  ) {
    if (event.data.type === 'wasm-webr-fetch-request') {
      if (!this.#registration?.active) {
        throw new Error("Can't respond to service worker request, no active registration.");
      }
      switch (event.data.msg.type) {
        case 'read': {
          const response = await this.inputQueue.get();
          this.#registration?.active.postMessage({
            type: 'wasm-webr-fetch-response',
            uuid: event.data.uuid,
            response: newResponse(event.data.uuid, response),
          });
          break;
        }
        default:
          throw new TypeError(`Unsupported request type '${event.data.msg.type}'.`);
      }
      return;
    }
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

      case 'sync-request':
        throw new TypeError(
          "Can't send messages of type 'sync-request' in service worker mode." +
            'Use service worker fetch request instead.'
        );

      case 'request':
        throw new TypeError(
          "Can't send messages of type 'request' from a worker." +
            'Use service worker fetch request instead.'
        );
    }
  };
}

// Worker --------------------------------------------------------------

import { Module as _Module } from '../module';

declare let Module: _Module;
// callMain function readied by Emscripten
declare let callMain: (args: string[]) => void;

export class ServiceWorkerChannelWorker {
  #ep: Endpoint;
  #dispatch: (msg: Message) => void = () => 0;
  onMessageFromMainThread: (msg: Message) => void = () => {};

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
    const msg = newRequest({ type: 'read' });
    const request = new XMLHttpRequest();
    request.open('POST', './__wasm__/webr-fetch-request/', false);
    request.send(JSON.stringify(msg));
    const response = JSON.parse(request.responseText) as Response;
    return response.data.resp as Message;
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

  setInterrupt(_: () => void) {}
  handleInterrupt() {}
  setDispatchHandler(dispatch: (msg: Message) => void) {
    this.#dispatch = dispatch;
  }
}
