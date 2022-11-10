import { generateUUID, transfer, UUID } from './task-common';

export interface Message {
  type: string;
  data?: any;
}

export interface Request {
  type: 'request';
  data: {
    uuid: UUID;
    msg: Message;
  };
}

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

export interface SyncRequest {
  type: 'sync-request';
  data: {
    msg: Message;
    reqData: SyncRequestData;
  };
}

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

// TODO: Pass a `replacer` function
export function encodeData(data: any): Uint8Array {
  return encoder.encode(JSON.stringify(data));
}

export function decodeData(data: Uint8Array): unknown {
  return JSON.parse(decoder.decode(data)) as unknown;
}
