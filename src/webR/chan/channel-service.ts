import { promiseHandles, newCrossOriginWorker, isCrossOrigin } from '../utils';
import {
  Message,
  newRequest,
  Response,
  Request,
  newResponse,
} from './message';
import { encode, decode } from '@msgpack/msgpack';
import { Endpoint } from './task-common';
import { ChannelMain, ChannelWorker } from './channel';
import { ChannelType } from './channel-common';
import { WebROptions } from '../webr-main';
import { WebRChannelError } from '../error';

import { IN_NODE } from '../compat';
import type { Worker as NodeWorker } from 'worker_threads';
if (IN_NODE) {
  (globalThis as any).Worker = require('worker_threads').Worker as NodeWorker;
}

// Main ----------------------------------------------------------------

export class ServiceWorkerChannelMain extends ChannelMain {
  initialised: Promise<unknown>;

  resolve: (_?: unknown) => void;
  close = () => { return; };

  #syncMessageCache = new Map<string, Message>();
  #registration?: ServiceWorkerRegistration;
  #interrupted = false;

  constructor(config: Required<WebROptions>) {
    super();
    console.warn(
      "The ServiceWorker communication channel is deprecated and will be removed in a future version of webR. " +
      "Consider using the PostMessage channel instead. If blocking input is required (for example, `browser()`) " +
      "the SharedArrayBuffer channel should be used. See https://docs.r-wasm.org/webr/latest/serving.html for further information."
    );
    const initWorker = (worker: Worker) => {
      this.#handleEventsFromWorker(worker);
      this.close = () => {
        worker.terminate();
        this.putClosedMessage();
      };
      void this.#registerServiceWorker(`${config.serviceWorkerUrl}webr-serviceworker.js`)
        .then(
          (clientId) => {
            const msg = {
              type: 'init',
              data: {
                config,
                channelType: ChannelType.ServiceWorker,
                clientId,
                location: window.location.href,
              },
            } as Message;
            worker.postMessage(msg);
          }
        );
    };

    if (isCrossOrigin(config.serviceWorkerUrl)) {
      newCrossOriginWorker(`${config.serviceWorkerUrl}webr-worker.js`, (worker: Worker) =>
        initWorker(worker)
      );
    } else {
      const worker = new Worker(`${config.serviceWorkerUrl}webr-worker.js`);
      initWorker(worker);
    }

    ({ resolve: this.resolve, promise: this.initialised } = promiseHandles());
  }

  activeRegistration(): ServiceWorker {
    if (!this.#registration?.active) {
      throw new WebRChannelError('Attempted to obtain a non-existent active registration.');
    }
    return this.#registration.active;
  }

  interrupt() {
    this.#interrupted = true;
  }

  async #registerServiceWorker(url: string): Promise<string> {
    // Register service worker
    this.#registration = await navigator.serviceWorker.register(url);
    await navigator.serviceWorker.ready;
    window.addEventListener('beforeunload', () => {
      void this.#registration?.unregister();
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
      this.activeRegistration().postMessage({ type: 'register-client-main' });
    });

    // Setup listener for service worker messages
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent<Request>) => {
      void this.#onMessageFromServiceWorker(event);
    });
    return clientId;
  }

  async #onMessageFromServiceWorker(event: MessageEvent<Message>) {
    if (event.data.type === 'request') {
      const uuid = event.data.data as string;
      const message = this.#syncMessageCache.get(uuid);
      if (!message) {
        throw new WebRChannelError('Request not found during service worker XHR request');
      }
      this.#syncMessageCache.delete(uuid);
      switch (message.type) {
        case 'read': {
          const response = await this.inputQueue.get();
          this.activeRegistration().postMessage({
            type: 'wasm-webr-fetch-response',
            uuid: uuid,
            response: newResponse(uuid, response),
          });
          break;
        }
        case 'interrupt': {
          const response = this.#interrupted;
          this.activeRegistration().postMessage({
            type: 'wasm-webr-fetch-response',
            uuid: uuid,
            response: newResponse(uuid, response),
          });
          this.inputQueue.reset();
          this.#interrupted = false;
          break;
        }
        default:
          throw new WebRChannelError(`Unsupported request type '${message.type}'.`);
      }
      return;
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

  #onMessageFromWorker = (worker: Worker, message: Message) => {
    if (!message || !message.type) {
      return;
    }

    switch (message.type) {
      case 'resolve':
        this.resolve();
        return;

      case 'response':
        this.resolveResponse(message as Response);
        return;

      case 'system':
        this.systemQueue.put(message.data as Message);
        return;

      default:
        this.outputQueue.put(message);
        return;

      case 'sync-request': {
        const request = message.data as Request;
        this.#syncMessageCache.set(request.data.uuid, request.data.msg);
        return;
      }

      case 'request':
        throw new WebRChannelError(
          "Can't send messages of type 'request' from a worker." +
          'Use service worker fetch request instead.'
        );
    }
  };
}

// Worker --------------------------------------------------------------

import { Module } from '../emscripten';

export class ServiceWorkerChannelWorker implements ChannelWorker {
  #ep: Endpoint;
  #mainThreadId: string;
  #location: string;
  #lastInterruptReq = Date.now();
  #dispatch: (msg: Message) => void = () => 0;
  #interrupt = () => { return; };
  onMessageFromMainThread: (msg: Message) => void = () => { return; };

  constructor(data: { clientId?: string; location?: string }) {
    if (!data.clientId || !data.location) {
      throw new WebRChannelError("Can't start service worker channel");
    }
    this.#mainThreadId = data.clientId;
    this.#location = data.location;
    this.#ep = (IN_NODE ? require('worker_threads').parentPort : globalThis) as Endpoint;
  }

  resolve() {
    this.write({ type: 'resolve' });
  }

  write(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage(msg, transfer);
  }

  writeSystem(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage({ type: 'system', data: msg }, transfer);
  }

  syncRequest(message: Message): Response {
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
    this.write({ type: 'sync-request', data: request });

    let retryCount = 0;
    for (; ;) {
      try {
        const url = new URL('__wasm__/webr-fetch-request/', this.#location);
        const xhr = new XMLHttpRequest();
        xhr.timeout = 60000;
        xhr.responseType = 'arraybuffer';
        xhr.open('POST', url, false);
        const fetchReqBody = {
          clientId: this.#mainThreadId,
          uuid: request.data.uuid,
        };
        xhr.send(encode(fetchReqBody));
        return decode(xhr.response as ArrayBuffer) as Response;
      } catch (e: any) {
        if (e instanceof DOMException && retryCount++ < 1000) {
          console.log('Service worker request failed - resending request');
        } else {
          throw e;
        }
      }
    }
  }

  read(): Message {
    const response = this.syncRequest({ type: 'read' });
    return response.data.resp as Message;
  }

  inputOrDispatch(): number {
    for (; ;) {
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
     *
     * The rate of requests is limited to once per second. This stops the
     * browser being overloaded with XHR sync requests while R is working.
     */
    if (Date.now() > this.#lastInterruptReq + 1000) {
      this.#lastInterruptReq = Date.now();
      const response = this.syncRequest({ type: 'interrupt' });
      const interrupted = response.data.resp as boolean;
      if (interrupted) {
        this.#interrupt();
      }
    }
  }

  setDispatchHandler(dispatch: (msg: Message) => void) {
    this.#dispatch = dispatch;
  }
}
