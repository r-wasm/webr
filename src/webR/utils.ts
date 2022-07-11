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

export type Rptr = number;

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
  _LENGTH: (ptr: Rptr) => Rptr;
  _TYPEOF: (ptr: Rptr) => Rptr;
  _INTEGER: (ptr: Rptr) => Rptr;
  _REAL: (ptr: Rptr) => Rptr;
  _COMPLEX: (ptr: Rptr) => Rptr;
  _R_CHAR: (ptr: Rptr) => Rptr;
  _RAW: (ptr: Rptr) => Rptr;
  _STRING_ELT: (ptr: Rptr, idx: number) => Rptr;
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
