/**
 * @module WebRChan
 */
import { Message } from './chan/message';
import { UUID as ShelterID } from './chan/task-common';
import { WebRPayloadWorker, WebRPayloadPtr } from './payload';
import { RType, WebRData } from './robj';

export { isUUID as isShelterID, UUID as ShelterID } from './chan/task-common';

export interface CallRObjectMethodMessage extends Message {
  type: 'callRObjectMethod';
  data: {
    payload?: WebRPayloadPtr;
    prop: string;
    args: WebRPayloadWorker[];
    shelter?: ShelterID; // TODO: Remove undefined
  };
}

/**
 * The configuration settings used when evaluating R code.
 */
export interface CaptureROptions {
  /**
   * The R environment to evaluate within.
   * Deafult: The global environment.
   */
  env?: WebRData;
  /**
   * Should the stdout and stderr output streams be captured and returned?
   * Deafult: `true`.
   */
  captureStreams?: boolean;
  /**
   * Should conditions raised during execution be captured and returned?
   * Default: `true`.
   */
  captureConditions?: boolean;
  /**
   * Should the code automatically print output as if it were written at an R console?
   * Default: `false`.
   */
  withAutoprint?: boolean;
  /**
   * Should an R error condition be re-thrown as a JavaScript exception?
   * Deafult: `true`.
   */
  throwJsException?: boolean;
  /**
   * Should the code be executed using a `tryCatch` with handlers in place?
   * Deafult: `true`.
   */
  withHandlers?: boolean;
}

export interface CaptureRMessage extends Message {
  type: 'captureR';
  data: {
    code: string;
    options: CaptureROptions;
    shelter: ShelterID;
  };
}

export interface EvalRMessage extends Message {
  type: 'evalR';
  data: {
    code: string;
    options: CaptureROptions;
    shelter: ShelterID;
    outputType?: EvalRMessageOutputType
  };
}

export type EvalRMessageOutputType = 'void' | 'boolean' | 'number' | 'string';

export interface EvalRMessageRaw extends Message {
  type: 'evalRRaw';
  data: {
    code: string;
    options: CaptureROptions;
    outputType: EvalRMessageOutputType
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
    shelter: ShelterID;
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
