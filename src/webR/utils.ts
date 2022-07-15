import { RPtr, SexpType } from './sexp';

export type FSNode = {
  id: number;
  name: string;
  mode: number;
  isFolder: boolean;
  contents: { [key: string]: FSNode };
};

export interface WebROptions {
  RArgs?: string[];
  REnv?: { [key: string]: string };
  WEBR_URL?: string;
  PKG_URL?: string;
  homedir?: string;
}

export type XHRResponse = {
  status: number;
  response: string | ArrayBuffer;
};

export interface Module extends EmscriptenModule {
  ENV: { [key: string]: string };
  monitorRunDependencies: (n: number) => void;
  noImageDecoding: boolean;
  noAudioDecoding: boolean;
  setPrompt: (prompt: string) => void;
  canvasExec: (op: string) => void;
  downloadFileContent: (URL: string, headers: Array<string>) => XHRResponse;
  _evalRCode: (code: number, errPtr: number) => number;
  // Utility functions from Rinternals.h
  _Rf_ScalarReal: (n: number) => RPtr;
  _Rf_ScalarLogical: (l: boolean) => RPtr;
  _Rf_mkString: (ptr: number) => RPtr;
  _Rf_allocVector: (type: SexpType, n: number) => RPtr;
  _Rf_eval: (call: RPtr, env: RPtr) => RPtr;
  _LENGTH: (ptr: RPtr) => RPtr;
  _TYPEOF: (ptr: RPtr) => RPtr;
  _INTEGER: (ptr: RPtr) => RPtr;
  _REAL: (ptr: RPtr) => RPtr;
  _COMPLEX: (ptr: RPtr) => RPtr;
  _R_CHAR: (ptr: RPtr) => RPtr;
  _RAW: (ptr: RPtr) => RPtr;
  _LOGICAL: (ptr: RPtr) => RPtr;
  _FRAME: (ptr: RPtr) => RPtr;
  _ATTRIB: (ptr: RPtr) => RPtr;
  _PRINTNAME: (ptr: RPtr) => RPtr;
  _SYMVALUE: (ptr: RPtr) => RPtr;
  _INTERNAL: (ptr: RPtr) => RPtr;
  _CAR: (ptr: RPtr) => RPtr;
  _CDR: (ptr: RPtr) => RPtr;
  _TAG: (ptr: RPtr) => RPtr;
  _CLOENV: (x: RPtr) => RPtr;
  _STRING_ELT: (ptr: RPtr, idx: number) => RPtr;
  _VECTOR_ELT: (ptr: RPtr, idx: number) => RPtr;
  _SETCAR: (x: RPtr, y: RPtr) => void;
  // TODO: Namespace all webR properties
  webr: {
    readConsole: () => number;
    resolveInit: () => void;
  };
}

export type ResolveFn = (_value?: unknown) => void;
export type RejectFn = (_reason?: any) => void;

export function promiseHandles() {
  const out = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    resolve: (_value?: unknown) => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    reject: (_reason?: any) => {},
    promise: null as unknown as Promise<unknown>,
  };

  const promise = new Promise((resolve, reject) => {
    out.resolve = resolve;
    out.reject = reject;
  });
  out.promise = promise;

  return out;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
