import type { RPtr, RTypeNumber } from './robj';
import type { UnwindProtectException } from './utils-r';

export interface Module extends EmscriptenModule {
  /* Add mkdirTree to FS namespace, missing from @types/emscripten at the
   * time of writing.
   */
  FS: typeof FS & {
    mkdirTree(path: string): void;
  };
  ENV: { [key: string]: string };
  GOT: {
    [key: string]: {required: boolean; value: number};
  }
  createLazyFilesystem: () => void;
  monitorRunDependencies: (n: number) => void;
  noImageDecoding: boolean;
  noAudioDecoding: boolean;
  noWasmDecoding: boolean;
  setPrompt: (prompt: string) => void;
  canvasExec: (op: string) => void;
  downloadFileContent: (
    URL: string,
    headers: Array<string>
  ) => {
    status: number;
    response: string | ArrayBuffer;
  };
  // Exported Emscripten JS API
  allocateUTF8: typeof allocateUTF8;
  allocateUTF8OnStack: typeof allocateUTF8OnStack;
  getValue: typeof getValue;
  setValue: typeof setValue;
  UTF8ToString: typeof UTF8ToString;
  callMain: (args: string[]) => void;
  getWasmTableEntry: (entry: number) => Function;
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
  _R_lsInternal3: (env: RPtr, all: number, sorted: number) => RPtr;
  _R_MakeExternalPtr: (p: number, tag: RPtr, prot: RPtr) => RPtr;
  _R_NewEnv: (enclos: RPtr, hash: number, size: number) => RPtr;
  _R_ParseEvalString: (code: number, env: RPtr) => RPtr;
  _R_PreserveObject: (ptr: RPtr) => void;
  _R_ReleaseObject: (ptr: RPtr) => void;
  _R_ReplDLLinit: () => void;
  _R_ReplDLLdo1: () => number;
  _Rf_ScalarReal: (n: number) => RPtr;
  _Rf_ScalarLogical: (l: number) => RPtr;
  _Rf_ScalarInteger: (n: number) => RPtr;
  _Rf_ScalarString: (s: string) => RPtr;
  _Rf_allocList: (len: number) => RPtr;
  _Rf_allocVector: (type: RTypeNumber, len: number) => RPtr;
  _Rf_defineVar: (symbol: RPtr, value: RPtr, env: RPtr) => void;
  _Rf_error: (msg: EmPtr) => void;
  _Rf_eval: (call: RPtr, env: RPtr) => RPtr;
  _Rf_findVarInFrame: (rho: RPtr, symbol: RPtr) => RPtr;
  _Rf_listAppend: (source: RPtr, target: RPtr) => RPtr;
  _Rf_getAttrib: (ptr1: RPtr, ptr2: RPtr) => RPtr;
  _Rf_initialize_R: (argc: number, argv: RPtr) => void;
  _Rf_install: (ptr: number) => RPtr;
  _Rf_installTrChar: (name: RPtr) => RPtr;
  _Rf_lang1: (ptr1: RPtr) => RPtr;
  _Rf_lang2: (ptr1: RPtr, ptr2: RPtr) => RPtr;
  _Rf_lang3: (ptr1: RPtr, ptr2: RPtr, ptr3: RPtr) => RPtr;
  _Rf_lang4: (ptr1: RPtr, ptr2: RPtr, ptr3: RPtr, ptr4: RPtr) => RPtr;
  _Rf_lang5: (ptr1: RPtr, ptr2: RPtr, ptr3: RPtr, ptr4: RPtr, ptr5: RPtr) => RPtr;
  _Rf_lang6: (ptr1: RPtr, ptr2: RPtr, ptr3: RPtr, ptr4: RPtr, ptr5: RPtr, ptr6: RPtr) => RPtr;
  _Rf_mkChar: (ptr: number) => RPtr;
  _Rf_mkString: (ptr: number) => RPtr;
  _Rf_onintr: () => void;
  _Rf_protect: (ptr: RPtr) => RPtr;
  _R_ContinueUnwind: (cont: RPtr) => never;
  _R_ProtectWithIndex: (ptr1: RPtr, ptr2: RPtr) => void;
  _R_Reprotect: (ptr1: RPtr, ptr2: RPtr) => void;
  _Rf_setAttrib: (ptr1: RPtr, ptr2: RPtr, ptr3: RPtr) => RPtr;
  _Rf_unprotect: (n: number) => void;
  _Rf_unprotect_ptr: (ptr: RPtr) => void;
  _DLLbuf: RPtr;
  _DLLbufp: RPtr;
  _R_BaseEnv: RPtr;
  _R_BracketSymbol: RPtr;
  _R_Bracket2Symbol: RPtr;
  _R_DollarSymbol: RPtr;
  _R_EmptyEnv: RPtr;
  _R_FalseValue: RPtr;
  _R_GlobalEnv: RPtr;
  _R_Interactive: RPtr;
  _R_NaInt: RPtr;
  _R_NaReal: RPtr;
  _R_NaString: RPtr;
  _R_LogicalNAValue: RPtr;
  _R_NilValue: RPtr;
  _R_TrueValue: RPtr;
  _R_NamesSymbol: RPtr;
  _R_UnboundValue: RPtr;
  _SET_STRING_ELT: (ptr: RPtr, idx: number, val: RPtr) => void;
  _SET_VECTOR_ELT: (ptr: RPtr, idx: number, val: RPtr) => void;
  _setup_Rmainloop: () => void;
  _strcpy: (dest: RPtr, src: RPtr) => number;
  // TODO: Namespace all webR properties
  webr: {
    UnwindProtectException: typeof UnwindProtectException;
    readConsole: () => number;
    resolveInit: () => void;
    handleEvents: () => void;
    evalJs: (code: RPtr) => number;
    setTimeoutWasm: (ptr: EmPtr, data: EmPtr, delay: number) => void;
  };
}

export const Module = {} as Module;

export type EmPtr = ReturnType<typeof Module.allocateUTF8>;

export interface DictEmPtrs {
  [key: string]: EmPtr;
}

export function dictEmFree(dict: { [key: string | number]: EmPtr }) {
  Object.keys(dict).forEach((key) => Module._free(dict[key]));
}
