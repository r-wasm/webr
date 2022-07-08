// TODO: Export from here
import { Message } from './channel'

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
