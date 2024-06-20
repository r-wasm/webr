/**
 * @module WebRChan
 */
import { Message } from './chan/message';
import { UUID as ShelterID } from './chan/task-common';
import { EmPtr } from './emscripten';
import { WebRPayloadWorker, WebRPayloadPtr } from './payload';
import { RType, RCtor, WebRData, WebRDataJsAtomic } from './robj';
import type { FSType, FSMountOptions } from './webr-main';

export { isUUID as isShelterID, UUID as ShelterID } from './chan/task-common';

/** @internal */
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
 * The configuration settings used when installing R packages.
 */
export interface InstallPackagesOptions {
  /**
   * The R package repositories from which to download packages.
   * Default: The configured default webR package repository.
   */
  repos?: string | string[];
  /**
   * If `true`, do not output downloading messages.
   * Default: `false`.
   */
  quiet?: boolean;
  /**
   * If `true`, attempt to mount packages using filesystem images.
   * Default: `true`.
   */
  mount?: boolean;
}

/** @internal */
export interface InstallPackagesMessage extends Message {
  type: 'installPackages';
  data: {
    name: string | string[];
    options: InstallPackagesOptions;
  };
}

/**
 * The configuration settings used when evaluating R code.
 */
export interface EvalROptions {
  /**
   * The R environment to evaluate within.
   * Default: The global environment.
   */
  env?: WebRData;
  /**
   * Should the stdout and stderr output streams be captured and returned?
   * Default: `true`.
   */
  captureStreams?: boolean;
  /**
   * Should conditions raised during execution be captured and returned?
   * Default: `true`.
   */
  captureConditions?: boolean;
  /**
   * Should a new canvas graphics device configured to capture plots be started?
   * Either a boolean value, or an object with properties corresponding to
   * `webr::canvas()` graphics device arguments.
   * Default: `true`.
   */
  captureGraphics?: boolean | {
    width: number;
    height: number;
    pointsize?: number;
    bg?: string;
    capture?: true;
  };
  /**
   * Should the code automatically print output as if it were written at an R console?
   * Default: `false`.
   */
  withAutoprint?: boolean;
  /**
   * Should an R error condition be re-thrown as a JavaScript exception?
   * Default: `true`.
   */
  throwJsException?: boolean;
  /**
   * Should the code be executed using a `tryCatch` with handlers in place?
   * Default: `true`.
   */
  withHandlers?: boolean;
}

/** @internal */
export interface CaptureRMessage extends Message {
  type: 'captureR';
  data: {
    code: string;
    options: EvalROptions;
    shelter: ShelterID;
  };
}

/** @internal */
export interface EvalRMessage extends Message {
  type: 'evalR';
  data: {
    code: string;
    options: EvalROptions;
    shelter: ShelterID;
    outputType?: EvalRMessageOutputType
  };
}

export type EvalRMessageOutputType =
  | 'void'
  | 'boolean'
  | 'boolean[]'
  | 'number'
  | 'number[]'
  | 'string'
  | 'string[]';

/** @internal */
export interface EvalRMessageRaw extends Message {
  type: 'evalRRaw';
  data: {
    code: string;
    options: EvalROptions;
    outputType: EvalRMessageOutputType
  };
}

/** @internal */
export interface FSMessage extends Message {
  type: 'lookupPath' | 'mkdir' | 'rmdir' | 'unlink' | 'unmount';
  data: { path: string };
}

/** @internal */
export interface FSMountMessage extends Message {
  type: 'mount';
  data: {
    type: FSType;
    options: FSMountOptions;
    mountpoint: string;
  };
}

/** @internal */
export interface FSSyncfsMessage extends Message {
  type: 'syncfs';
  data: { populate: boolean };
}

/** @internal */
export interface FSReadFileMessage extends Message {
  type: 'readFile';
  data: {
    path: string;
    flags?: string;
  };
}

/** @internal */
export interface FSWriteFileMessage extends Message {
  type: 'writeFile';
  data: {
    path: string;
    data: ArrayBufferView;
    flags?: string;
  };
}

/** @internal */
export interface InvokeWasmFunctionMessage extends Message {
  type: 'invokeWasmFunction';
  data: { ptr: EmPtr; args: number[] };
}

/** @internal */
export interface NewRObjectMessage extends Message {
  type: 'newRObject';
  data: {
    args: WebRData[];
    objType: RType | RCtor;
    shelter: ShelterID;
  };
}

/** @internal */
export interface NewShelterMessage extends Message {
  type: 'newShelter';
}

/** @internal */
export interface ShelterMessage extends Message {
  type: 'shelterPurge' | 'shelterSize';
  data: ShelterID;
}

/** @internal */
export interface ShelterDestroyMessage extends Message {
  type: 'shelterDestroy';
  data: { id: ShelterID; obj: WebRPayloadPtr };
}

export interface CanvasMessage extends Message {
  type: 'canvas',
  data: {
    event: 'canvasNewPage';
    id: number;
  } | {
    event: 'canvasImage';
    image: ImageBitmap;
    id: number,
  };
}

export interface PagerMessage extends Message {
  type: 'pager';
  data: {
    path: string;
    header: string;
    title: string;
    deleteFile: boolean;
  };
}

export interface ViewMessage extends Message {
  type: 'view';
  data: {
    data: {
      [key: string]: WebRDataJsAtomic<string>;
    };
    title: string;
  };
}
