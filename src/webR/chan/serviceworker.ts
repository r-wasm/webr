import type { Request as MessageRequest } from './message';
import { promiseHandles } from '../utils';

declare let self: ServiceWorkerGlobalScope;

const requests: {
  [key: string]: {
    resolve: (_value?: unknown) => void;
    reject: (_reason?: any) => void;
    promise: Promise<unknown>;
  };
} = {};

function handleInstall() {
  console.log('Service worker installed');
  self.skipWaiting();
}

function handleActivate(event: ExtendableEvent) {
  console.log('Service worker activating');
  event.waitUntil(self.clients.claim());
}

const handleFetch = (event: FetchEvent) => {
  // console.log('service worker got a fetch', event);
  const wasmMatch = /\/__wasm__\/webr-fetch-request\//.exec(event.request.url);
  if (!wasmMatch) {
    return;
  }

  const sendRequest = async () => {
    const client = await self.clients.get(event.clientId);
    if (!client) {
      throw new Error('Service worker client not found');
    }

    const message = (await event.request.json()) as MessageRequest;
    if (!(message.data.uuid in requests)) {
      requests[message.data.uuid] = promiseHandles();
      client.postMessage({
        type: 'wasm-webr-fetch-request',
        uuid: message.data.uuid,
        msg: message.data.msg,
      });
    }

    const response = await requests[message.data.uuid].promise;
    const headers = { 'Cross-Origin-Embedder-Policy': 'require-corp' };
    return new Response(JSON.stringify(response), { headers });
  };

  const requestReponse = sendRequest();
  event.waitUntil(requestReponse);
  event.respondWith(requestReponse);
};

function handleMessage(event: ExtendableMessageEvent) {
  // console.log('service worker got a message', event.data);
  switch (event.data.type) {
    case 'register-client-main': {
      self.clients.claim();
      const source = event.source as WindowClient;
      self.clients.get(source.id).then((client) => {
        if (!client) {
          throw new Error('Unable to respond to client in service worker message handler');
        }
        client.postMessage({
          type: 'registration-successful',
          clientId: source.id,
        });
      });
      break;
    }
    case 'wasm-webr-fetch-response': {
      if (event.data.uuid in requests) {
        requests[event.data.uuid].resolve(event.data.response);
        delete requests[event.data.uuid];
      }
      break;
    }
    default:
      throw new Error(`Unknown service worker message type: ${event.data.type as string}`);
  }
}

self.addEventListener('install', handleInstall);
self.addEventListener('activate', handleActivate);
self.addEventListener('fetch', handleFetch);
self.addEventListener('message', handleMessage);
