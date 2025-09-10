/**
 * WebR communication channel messaging and request types.
 * @module Message
 */
import { generateUUID, transfer, UUID } from './task-common';

/** A webR communication channel message. */
export interface Message {
  type: string;
  data?: any;
}

/** A webR communication channel request. */
export interface Request {
  type: 'request';
  data: {
    uuid: UUID;
    msg: Message;
  };
}

/** A webR communication channel event message. */
export interface EventMessage {
  type: 'event';
  data: {
    msg: Message;
  };
}

/** A webR communication channel response. */
export interface Response {
  type: 'response';
  data: {
    uuid: UUID;
    resp: Message;
  };
}

/** @internal */
export function newRequest(msg: Message, transferables?: [Transferable]): Request {
  return newRequestResponseMessage(
    {
      type: 'request',
      data: {
        uuid: generateUUID(),
        msg: msg,
      },
    },
    transferables
  );
}

/** @internal */
export function newResponse(uuid: UUID, resp: Message, transferables?: [Transferable]): Response {
  return newRequestResponseMessage(
    {
      type: 'response',
      data: {
        uuid,
        resp,
      },
    },
    transferables
  );
}

/** @internal */
function newRequestResponseMessage<T>(msg: T, transferables?: [Transferable]): T {
  // Signal to Synclink that the data contains objects we wish to
  // transfer, as in `postMessage()`
  if (transferables) {
    transfer(msg, transferables);
  }
  return msg;
}

/** A webR communication channel `eval-response` message.
 * @internal
 */
export interface EvalResponse {
  type: 'eval-response';
  data: {
    result?: unknown;
    error?: string;
  };
}

/** A webR communication channel `proxyWebSocket` message.
 * @internal
 */
export interface ProxyWebSocketMessage {
  type: 'proxyWebSocket';
  data: {
    uuid: string;
    url: string;
    protocol?: string;
  };
}

/** A webR communication channel `sendWebSocket` message.
 * @internal
 */
export interface SendWebSocketMessage {
  type: 'sendWebSocket';
  data: {
    uuid: string;
    data: string | ArrayBufferLike | Blob | ArrayBufferView;
  };
}

/** A webR communication channel `closeWebSocket` message.
 * @internal
 */
export interface CloseWebSocketMessage {
  type: 'closeWebSocket';
  data: {
    uuid: string;
    code?: number;
    reason?: string;
  };
}

/** A webR communication channel `websocket-message` message.
 * @internal
 */
export interface WebSocketMessage {
  type: 'websocket-message';
  data: {
    uuid: string;
    data: string | ArrayBufferLike | Blob | ArrayBufferView;
  };
}

/** A webR communication channel `websocket-open` message.
 * @internal
 */
export interface WebSocketOpenMessage {
  type: 'websocket-open';
  data: {
    uuid: string;
  };
}

/** A webR communication channel `websocket-close` message.
 * @internal
 */
export interface WebSocketCloseMessage {
  type: 'websocket-close';
  data: {
    uuid: string;
    code?: number;
    reason?: string;
  };
}

/** A webR communication channel `proxyWorker` message.
 * @internal
 */
export interface ProxyWorkerMessage {
  type: 'proxyWorker';
  data: {
    uuid: string;
    url: string;
    options?: WorkerOptions;
  };
}

/** A webR communication channel `postMessageWorker` message.
 * @internal
 */
export interface PostMessageWorkerMessage {
  type: 'postMessageWorker';
  data: {
    uuid: string;
    data: any;
    transfer?: Transferable[];
  };
}

/** A webR communication channel `terminateWorker` message.
 * @internal
 */
export interface TerminateWorkerMessage {
  type: 'terminateWorker';
  data: {
    uuid: string;
  };
}

/** A webR communication channel `worker-message` message.
 * @internal
 */
export interface WorkerMessage {
  type: 'worker-message';
  data: {
    uuid: string;
    data: any;
  };
}

/** A webR communication channel `worker-messageerror` message.
 * @internal
 */
export interface WorkerMessageErrorMessage {
  type: 'worker-messageerror';
  data: {
    uuid: string;
    data: any;
  };
}

/** A webR communication channel `worker-error` message.
 * @internal
 */
export interface WorkerErrorMessage {
  type: 'worker-error';
  data: {
    uuid: string;
  };
}

/** A webR communication channel sync-request.
 * @internal
 */
export interface SyncRequest {
  type: 'sync-request';
  data: {
    msg: Message;
    reqData: SyncRequestData;
  };
}

/** Transfer data required when using sync-request with SharedArrayBuffer.
 * @internal */
export interface SyncRequestData {
  taskId?: number;
  sizeBuffer: Int32Array;
  signalBuffer: Int32Array;
  dataBuffer: Uint8Array;
}

/** @internal */
export function newSyncRequest(msg: Message, data: SyncRequestData): SyncRequest {
  return {
    type: 'sync-request',
    data: { msg, reqData: data },
  };
}
