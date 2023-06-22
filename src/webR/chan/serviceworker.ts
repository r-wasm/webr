import { promiseHandles } from '../utils';
import { encode, decode } from '@msgpack/msgpack';
import { ServiceWorkerHandlers } from './channel';
import { WebRChannelError } from '../error';

declare let self: ServiceWorkerGlobalScope;

const requests: {
  [key: string]: {
    resolve: (_value?: unknown) => void;
    reject: (_reason?: any) => void;
    promise: Promise<unknown>;
  };
} = {};

export function handleInstall() {
  console.log('webR service worker installed');
  self.skipWaiting();
}

export function handleActivate(event: ExtendableEvent) {
  console.log('webR service worker activating');
  event.waitUntil(self.clients.claim());
}

async function sendRequest(clientId: string, uuid: string): Promise<Response> {
  const client = await self.clients.get(clientId);
  if (!client) {
    throw new WebRChannelError('Service worker client not found');
  }

  if (!(uuid in requests)) {
    requests[uuid] = promiseHandles();
    client.postMessage({ type: 'request', data: uuid });
  }

  const response = await requests[uuid].promise;
  const headers = { 'Cross-Origin-Embedder-Policy': 'require-corp' };
  return new Response(encode(response), { headers });
}

export function handleFetch(event: FetchEvent) {
  // console.log('service worker got a fetch', event);
  const wasmMatch = /__wasm__\/webr-fetch-request\//.exec(event.request.url);
  if (!wasmMatch) {
    return false;
  }
  const requestBody = event.request.arrayBuffer();
  const requestReponse = requestBody.then(async (body) => {
    const data = decode(body) as { clientId: string; uuid: string };
    return await sendRequest(data.clientId, data.uuid);
  });
  event.waitUntil(requestReponse);
  event.respondWith(requestReponse);
  return true;
}

export function handleMessage(event: ExtendableMessageEvent) {
  // console.log('service worker got a message', event.data);
  switch (event.data.type) {
    case 'register-client-main': {
      self.clients.claim();
      const source = event.source as WindowClient;
      self.clients.get(source.id).then((client) => {
        if (!client) {
          throw new WebRChannelError("Can't respond to client in service worker message handler");
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
      return false;
  }
  return true;
}

export const webRHandlers: ServiceWorkerHandlers = {
  handleInstall,
  handleActivate,
  handleFetch,
  handleMessage
};

self.addEventListener('install', webRHandlers.handleInstall);
self.addEventListener('activate', webRHandlers.handleActivate);
self.addEventListener('fetch', webRHandlers.handleFetch);
self.addEventListener('message', webRHandlers.handleMessage);
