import { Module, DictEmPtrs, dictEmFree, EmPtr } from './emscripten';
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

let evalBodyPtr: EmPtr | undefined;
let evalCleanupPtr: EmPtr | undefined;

function safeEvalBody(data: EmPtr): RPtr {
  const call = Module.getValue(data, 'i32');
  const env = Module.getValue(data + 4, 'i32');
  return Module._Rf_eval(call, env);
}

function safeEvalCleanup(cont: RPtr, jump: number): number {
  if (jump) {
    throw new UnwindProtectException('Unwind protection from safeEval invocation', cont);
  }
  return 0;
}

export function safeEval(call: RHandle, env: RHandle): RPtr {
  if (!evalBodyPtr) {
    evalBodyPtr = Module.addFunction(safeEvalBody, 'ii');
  }
  if (!evalCleanupPtr) {
    evalCleanupPtr = Module.addFunction(safeEvalCleanup, 'iii');
  }

  const dataPtr = Module._malloc(8);

  Module.setValue(dataPtr, handlePtr(call), '*');
  Module.setValue(dataPtr + 4, handlePtr(env), '*');

  const cont = Module._Rf_protect(Module._R_MakeUnwindCont());
  const res = Module._R_UnwindProtect(evalBodyPtr, dataPtr, evalCleanupPtr, cont, cont);
  unprotect(1);

  Module._free(dataPtr);
  return res;
}
