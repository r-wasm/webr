import { Module, DictEmPtrs, dictEmFree } from './emscripten';
import { WebRData, RPtr } from './robj';
import { RObject, REnvironment, RHandle, handlePtr } from './robj-worker';

export function protect<T extends RHandle>(x: T): T {
  Module._Rf_protect(handlePtr(x));
  return x;
}

export function protectInc<T extends RHandle>(x: T, prot: { n: number }): T {
  Module._Rf_protect(handlePtr(x));
  ++prot.n;
  return x;
}

export function protectWithIndex(x: RHandle): { loc: number; ptr: RPtr } {
  // Integer size hardcoded to 4 bytes. This is fine but is there a
  // way to call sizeof?
  const pLoc = Module._malloc(4);

  Module._R_ProtectWithIndex(handlePtr(x), pLoc);
  const loc = Module.getValue(pLoc, 'i32');

  return { loc: loc, ptr: pLoc };
}

export function unprotectIndex(index: { ptr: RPtr }): void {
  Module._Rf_unprotect(1);
  Module._free(index.ptr);
}

export function reprotect<T extends RHandle>(x: T, index: { loc: number; ptr: RPtr }): T {
  Module._R_Reprotect(handlePtr(x), index.loc);
  return x;
}

export function unprotect(n: number) {
  Module._Rf_unprotect(n);
}

// rlang convention: `env`-prefixed functions consistently take `env`
// as first argument
export function envPoke(env: RHandle, sym: RHandle, value: RHandle) {
  Module._Rf_defineVar(handlePtr(sym), handlePtr(value), handlePtr(env));
}

export function parseEvalBare(code: string, env: WebRData): RObject {
  const strings: DictEmPtrs = {};
  const prot = { n: 0 };

  try {
    const envObj = new REnvironment(env);
    protectInc(envObj, prot);

    strings.code = Module.allocateUTF8(code);

    const out = Module._R_ParseEvalString(strings.code, envObj.ptr);
    return RObject.wrap(out);
  } finally {
    dictEmFree(strings);
    unprotect(prot.n);
  }
}

export class UnwindProtectException extends Error {
  cont: RPtr;
  constructor(message: string, cont: RPtr) {
    super(message);
    this.name = 'UnwindProtectException';
    this.cont = cont;
  }
}

export function safeEval(call: RHandle, env: RHandle): RPtr {
  return Module.getWasmTableEntry(Module.GOT.ffi_safe_eval.value)(
    handlePtr(call),
    handlePtr(env)
  );
}
