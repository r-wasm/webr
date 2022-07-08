import { newUUID, UUID } from '../utils';
import { transfer } from './task-common'

export interface Message {
  type: string;
  data?: any;
};


export interface Request {
  type: 'request';
  data: {
    uuid: UUID;
    msg: Message;
  }
};

export interface Response {
  type: 'response';
  data: {
    uuid: UUID;
    resp: any
  }
};

export function newRequest(msg: Message,
                           transferables?: [Transferable]): Request {
  return newRequestResponseMessage(
    {
      type: 'request',
      data: {
        uuid: newUUID(),
        msg: msg
      }
    },
    transferables
  )
}

export function newResponse(uuid: UUID,
                            resp: any,
                            transferables?: [Transferable]) : Response {
  return newRequestResponseMessage(
    {
      type: 'response',
      data: {
        uuid,
        resp
      }
    },
    transferables
  )
}

function newRequestResponseMessage<T>(msg: T,
                                      transferables?: [Transferable]) : T {
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
    msg: Message
    reqData: SyncRequestData,
  }
};

export interface SyncRequestData {
  taskId?: number;
  sizeBuffer: Int32Array,
  signalBuffer: Int32Array,
  dataBuffer: Uint8Array,
}

export function newSyncRequest(msg: any, data: SyncRequestData): SyncRequest {
  return {
    type: 'sync-request',
    data: { msg, reqData: data }
  }
}
