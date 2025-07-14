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
