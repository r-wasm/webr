import { Module, DictEmPtrs, dictEmFree } from './emscripten';
import { WebRData } from './robj';
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
  let nProt = 0;

  try {
    const envObj = new REnvironment(env);
    envObj.protect();
    ++nProt;

    strings.code = Module.allocateUTF8(code);

    const out = Module._R_ParseEvalString(strings.code, envObj.ptr);
    return RObject.wrap(out);
  } finally {
    dictEmFree(strings);
    Module._Rf_unprotect(nProt);
  }
}
