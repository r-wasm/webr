import { Module, DictEmPtrs, dictEmFree } from './emscripten';
import { RPtr, WebRData } from './robj';
import { RObject, isRObject, REnvironment } from './robj-worker';

export function protect<T extends RObject | RPtr>(x: T): T {
  if (isRObject(x)) {
    Module._Rf_protect(x.ptr);
  } else {
    Module._Rf_protect(x);
  }
  return x;
}

export function unprotect(n: number) {
  Module._Rf_unprotect(n);
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
