import type { RPtr, RType } from './robj';

export interface Module extends EmscriptenModule {
  /* Add mkdirTree to FS namespace, missing from @types/emscripten at the
   * time of writing.
   */
  FS: typeof FS & {
    mkdirTree(path: string): void;
  };
  ENV: { [key: string]: string };
  monitorRunDependencies: (n: number) => void;
  noImageDecoding: boolean;
  noAudioDecoding: boolean;
  setPrompt: (prompt: string) => void;
  canvasExec: (op: string) => void;
  downloadFileContent: (
    URL: string,
    headers: Array<string>
  ) => {
    status: number;
    response: string | ArrayBuffer;
  };
  _evalRCode: (code: number, env: number) => number;
  // Exported Emscripten JS API
  allocateUTF8: (str: string) => number;
  // R symbols from Rinternals.h
  _ATTRIB: (ptr: RPtr) => RPtr;
  _CAR: (ptr: RPtr) => RPtr;
  _CDR: (ptr: RPtr) => RPtr;
  _CLOENV: (ptr: RPtr) => RPtr;
  _COMPLEX: (ptr: RPtr) => RPtr;
  _FRAME: (ptr: RPtr) => RPtr;
  _INTEGER: (ptr: RPtr) => RPtr;
  _INTERNAL: (ptr: RPtr) => RPtr;
  _LENGTH: (ptr: RPtr) => number;
  _LOGICAL: (ptr: RPtr) => RPtr;
  _PRINTNAME: (ptr: RPtr) => RPtr;
  _R_CHAR: (ptr: RPtr) => RPtr;
  _RAW: (ptr: RPtr) => RPtr;
  _REAL: (ptr: RPtr) => RPtr;
  _SETCAR: (x: RPtr, y: RPtr) => void;
  _STRING_ELT: (ptr: RPtr, idx: number) => RPtr;
  _STRING_PTR: (ptr: RPtr) => RPtr;
  _SYMVALUE: (ptr: RPtr) => RPtr;
  _TAG: (ptr: RPtr) => RPtr;
  _TYPEOF: (ptr: RPtr) => RPtr;
  _VECTOR_ELT: (ptr: RPtr, idx: number) => RPtr;
  _R_lsInternal: (env: RPtr, all: boolean) => RPtr;
  _Rf_allocVector: (type: RType, len: number) => RPtr;
  _Rf_eval: (call: RPtr, env: RPtr) => RPtr;
  _Rf_findVarInFrame: (rho: RPtr, symbol: RPtr) => RPtr;
  _Rf_installTrChar: (name: RPtr) => RPtr;
  _Rf_mkString: (ptr: number) => RPtr;
  _Rf_protect: (ptr: RPtr) => RPtr;
  _Rf_unprotect: (n: number) => void;
  _Rf_unprotect_ptr: (ptr: RPtr) => void;
  _R_BaseEnv: RPtr;
  _R_EmptyEnv: RPtr;
  _R_GlobalEnv: RPtr;
  _R_NilValue: RPtr;
  _R_UnboundValue: RPtr;
  // TODO: Namespace all webR properties
  webr: {
    readConsole: () => number;
    resolveInit: () => void;
  };
}