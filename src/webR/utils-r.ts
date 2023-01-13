import { Module, DictEmPtrs, dictEmFree } from './emscripten';
import { WebRData } from './robj';
import { RObject, REnvironment } from './robj-worker';

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
