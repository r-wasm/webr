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
    resp: unknown;
  };
}

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

export function newResponse(uuid: UUID, resp: unknown, transferables?: [Transferable]): Response {
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

function newRequestResponseMessage<T>(msg: T, transferables?: [Transferable]): T {
  // Signal to Synclink that the data contains objects we wish to
  // transfer, as in `postMessage()`
  if (transferables) {
    transfer(msg, transferables);
  }
  return msg;
}

/** A webR communication channel sync-request. */
export interface SyncRequest {
  type: 'sync-request';
  data: {
    msg: Message;
    reqData: SyncRequestData;
  };
}

/** Transfer data required when using sync-request with SharedArrayBuffer. */
export interface SyncRequestData {
  taskId?: number;
  sizeBuffer: Int32Array;
  signalBuffer: Int32Array;
  dataBuffer: Uint8Array;
}

export function newSyncRequest(msg: Message, data: SyncRequestData): SyncRequest {
  return {
    type: 'sync-request',
    data: { msg, reqData: data },
  };
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8');

/**
 * Encode data for transfering from worker thread to main thread.
 * @param {any} data The message data to be serialised and encoded.
 * @return {Uint8Array} The encoded data.
 * */
export function encodeData(data: any): Uint8Array {
  // TODO: Pass a `replacer` function
  return encoder.encode(JSON.stringify(data));
}

/**
 * Decode data that has been transferred from worker thread to main thread.
 * @param {any} data The message data to be decoded.
 * @return {unknown} The data after decoding.
 * */
export function decodeData(data: Uint8Array): unknown {
  return JSON.parse(decoder.decode(data)) as unknown;
}
