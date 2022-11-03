import { AsyncQueue } from './queue';
import { promiseHandles, ResolveFn } from '../utils';
import { Message, newRequest, Response, Request, newResponse } from './message';
import { Endpoint } from './task-common';
import { ChannelType, ChannelMain, ChannelWorker } from './channel';
import { WebROptions } from '../webr-main';

import { IN_NODE } from '../compat';
import type { Worker as NodeWorker } from 'worker_threads';
if (IN_NODE) {
  (globalThis as any).Worker = require('worker_threads').Worker as NodeWorker;
}

// Main ----------------------------------------------------------------

export class ServiceWorkerChannelMain implements ChannelMain {
  inputQueue = new AsyncQueue<Message>();
  outputQueue = new AsyncQueue<Message>();

  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;
  close = () => {};

  #parked = new Map<string, ResolveFn>();
  #registration?: ServiceWorkerRegistration;
  #interrupted = false;

  constructor(url: string, config: Required<WebROptions>) {
    const worker = new Worker(url);
    this.#handleEventsFromWorker(worker);
    this.close = () => worker.terminate();

    this.#registerServiceWorker(`${config.WEBR_URL}serviceworker.js`).then((clientId) => {
      const msg = {
        type: 'init',
        data: { config, channelType: ChannelType.ServiceWorker, clientId },
      } as Message;
      worker.postMessage(msg);
    });

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
    this.#interrupted = true;
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

  async #registerServiceWorker(url: string): Promise<string> {
    // Register service worker
    this.#registration = await navigator.serviceWorker.register(url);
    await navigator.serviceWorker.ready;
    window.addEventListener('beforeunload', () => {
      this.#registration?.unregister();
    });

    // Ensure we can communicate with service worker and we have a client ID
    const clientId = await new Promise<string>((resolve) => {
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
    return clientId;
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
        case 'interrupt': {
          const response = this.#interrupted;
          this.#registration?.active.postMessage({
            type: 'wasm-webr-fetch-response',
            uuid: event.data.uuid,
            response: newResponse(event.data.uuid, response),
          });
          this.#interrupted = false;
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

export class ServiceWorkerChannelWorker implements ChannelWorker {
  #ep: Endpoint;
  #mainThreadId: string;
  #dispatch: (msg: Message) => void = () => 0;
  #interrupt = () => {};
  onMessageFromMainThread: (msg: Message) => void = () => {};

  constructor(mainThreadId: string | undefined) {
    if (!mainThreadId) {
      throw Error('Unable to start service worker channel without a client ID for the main thread');
    }
    this.#mainThreadId = mainThreadId;
    this.#ep = (IN_NODE ? require('worker_threads').parentPort : globalThis) as Endpoint;
  }

  resolve() {
    this.write({ type: 'resolve' });
  }

  write(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage(msg, transfer);
  }

  request(message: Message): Response {
    /*
     * Browsers timeout service workers after about 5 minutes on inactivity.
     * See e.g. service_worker_version.cc in Chromium.
     *
     * To avoid the service worker being shut down, we timeout our XHR after
     * 1 minute and then resend the request as a keep-alive. The service worker
     * uses the message UUID to identify the request and continue waiting for a
     * response from where it left off.
     */
    const request = newRequest(message);
    for (;;) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.timeout = 60000;
        xhr.open('POST', './__wasm__/webr-fetch-request/', false);
        const fetchReqBody = {
          type: 'webr-fetch-request',
          data: {
            clientId: this.#mainThreadId,
            request: request,
          },
        };
        xhr.send(JSON.stringify(fetchReqBody));
        return JSON.parse(xhr.responseText) as Response;
      } catch (e: any) {
        if (e instanceof DOMException) {
          console.log('Service worker request failed - resending request');
        } else {
          throw e;
        }
      }
    }
  }

  read(): Message {
    const response = this.request({ type: 'read' });
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

  setInterrupt(interrupt: () => void) {
    this.#interrupt = interrupt;
  }

  handleInterrupt() {
    /* During R computation we have no way to directly interrupt the worker
     * thread. Instead, we hook into R's PolledEvents. Since we are not using
     * SharedArrayBuffer as a signal method, we instead send a message to the
     * main thread to ask if we should interrupt R.
     */
    const response = this.request({ type: 'interrupt' });
    const interrupted = response.data.resp as boolean;
    if (interrupted) {
      this.#interrupt();
    }
  }

  setDispatchHandler(dispatch: (msg: Message) => void) {
    this.#dispatch = dispatch;
  }
}
