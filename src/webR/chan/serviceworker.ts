import { promiseHandles } from '../utils';
import { decodeData, encodeData } from './message';

declare let self: ServiceWorkerGlobalScope;

const requests: {
  [key: string]: {
    resolve: (_value?: unknown) => void;
    reject: (_reason?: any) => void;
    promise: Promise<unknown>;
  };
} = {};

function handleInstall() {
  console.log('webR service worker installed');
  self.skipWaiting();
}

function handleActivate(event: ExtendableEvent) {
  console.log('webR service worker activating');
  event.waitUntil(self.clients.claim());
}

const sendRequest = async (clientId: string, uuid: string): Promise<Response> => {
  const client = await self.clients.get(clientId);
  if (!client) {
    throw new Error('Service worker client not found');
  }

  if (!(uuid in requests)) {
    requests[uuid] = promiseHandles();
    client.postMessage({ type: 'request', data: uuid });
  }

  const response = await requests[uuid].promise;
  const headers = { 'Cross-Origin-Embedder-Policy': 'require-corp' };
  return new Response(encodeData(response), { headers });
};

const handleFetch = (event: FetchEvent) => {
  // console.log('service worker got a fetch', event);
  const wasmMatch = /__wasm__\/webr-fetch-request\//.exec(event.request.url);
  if (!wasmMatch) {
    return;
  }
  const requestBody = event.request.arrayBuffer();
  const requestReponse = requestBody.then(async (body) => {
    const data = decodeData(new Uint8Array(body)) as { clientId: string; uuid: string };
    return await sendRequest(data.clientId, data.uuid);
  });
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
          throw new Error("Can't respond to client in service worker message handler");
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
