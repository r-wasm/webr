import { Message } from './chan/message';
import { UUID as ShelterID } from './chan/task-common';
import { WebRPayload, WebRPayloadPtr } from './payload';
import { RType, WebRData } from './robj';

export { isUUID as isShelterID, UUID as ShelterID } from './chan/task-common';

export interface CallRObjectMethodMessage extends Message {
  type: 'callRObjectMethod';
  data: {
    payload?: WebRPayloadPtr;
    prop: string;
    args: WebRPayload[];
    shelter?: ShelterID; // TODO: Remove undefined
  };
}

export interface EvalRMessage extends Message {
  type: 'evalR';
  data: {
    code: string;
    env?: WebRPayloadPtr;
    shelter: ShelterID;
  };
}

export interface FSMessage extends Message {
  type: 'lookupPath' | 'mkdir' | 'rmdir' | 'unlink';
  data: { path: string };
}

export interface FSReadFileMessage extends Message {
  type: 'readFile';
  data: {
    path: string;
    flags?: string;
  };
}

export interface FSWriteFileMessage extends Message {
  type: 'writeFile';
  data: {
    path: string;
    data: ArrayBufferView;
    flags?: string;
  };
}

export interface NewRObjectMessage extends Message {
  type: 'newRObject';
  data: {
    obj: WebRData;
    objType: RType | 'object';
    shelter?: ShelterID; // TODO: Remove undefined
  };
}

export interface NewShelterMessage extends Message {
  type: 'newShelter';
}

export interface ShelterMessage extends Message {
  type: 'shelterPurge' | 'shelterSize';
  data: ShelterID;
}

export interface ShelterDestroyMessage extends Message {
  type: 'shelterDestroy';
  data: { id: ShelterID; obj: WebRPayloadPtr };
}
