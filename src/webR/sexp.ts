import type { Module, Rptr } from './utils';

declare let Module: Module;

enum SEXPTYPE {
  NILSXP = 0,
  SYMSXP,
  LISTSXP,
  CLOSXP,
  ENVSXP,
  PROMSXP,
  LANGSXP,
  SPECIALSXP,
  BUILTINSXP,
  CHARSXP,
  LGLSXP,
  INTSXP = 13,
  REALSXP,
  CPLXSXP,
  STRSXP,
  DOTSXP,
  ANYSXP,
  VECSXP,
  EXPRSXP,
  BCODESXP,
  EXTPTRSXP,
  WEAKREFSXP,
  RAWSXP,
  S4SXP,
}

type Complex = {
  re: number;
  im: number;
};

export type ImplicitTypes =
  | number
  | string
  | boolean
  | undefined
  | Date
  | Number
  | Boolean
  | String
  | Complex
  | ArrayBuffer
  | ArrayBufferView
  | Array<ImplicitTypes>
  | Map<ImplicitTypes, ImplicitTypes>
  | Set<ImplicitTypes>
  | { [key: string]: ImplicitTypes };

export class RProxy {
  ptr: number;
  constructor(ptr: number) {
    this.ptr = ptr;
  }
  get [Symbol.toStringTag](): string {
    return `RProxy:${this.typeName}`;
  }
  get type(): SEXPTYPE {
    return Module._TYPEOF(this.ptr);
  }
  get typeName(): string {
    return SEXPTYPE[this.type];
  }
  get convertImplicitly(): boolean {
    return false;
  }
  get attrs(): RProxy {
    return wrapRSexp(Module._ATTRIB(this.ptr));
  }
  get isNil(): boolean {
    return Module._TYPEOF(this.ptr) === SEXPTYPE.NILSXP;
  }
  toJs(): ImplicitTypes {
    throw new TypeError('JS conversion for this R object is not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _call(_args: Array<any>): RProxy {
    throw new Error('This R object cannot be called.');
  }
}

class RProxyNil extends RProxy {
  toJs(): ImplicitTypes {
    return undefined;
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RProxySymbol extends RProxy {
  toJs(): ImplicitTypes {
    return {
      printname: this.printname.toJs(),
      // symvalue: this.symvalue.toJs()
      internal: this.internal.toJs(),
    };
  }
  get printname(): RProxyChar {
    return wrapRSexp(Module._PRINTNAME(this.ptr)) as RProxyChar;
  }
  get symvalue(): RProxy {
    return wrapRSexp(Module._SYMVALUE(this.ptr));
  }
  get internal(): RProxy {
    return wrapRSexp(Module._INTERNAL(this.ptr));
  }
}

class RProxyPairlist extends RProxy {
  toJs(): { [key: string]: ImplicitTypes } {
    const d: { [key: string]: ImplicitTypes } = {};
    let v: RProxy = wrapRSexp(Module._CAR(this.ptr));
    for (let next = this.ptr; Module._TYPEOF(next) !== SEXPTYPE.NILSXP; next = Module._CDR(next)) {
      v = wrapRSexp(Module._CAR(next));
      d[(wrapRSexp(Module._TAG(next)) as RProxySymbol).printname.toJs()] = v.toJs();
    }
    return d;
  }
  get car(): RProxy {
    return wrapRSexp(Module._CAR(this.ptr));
  }
  get cdr(): RProxy {
    return wrapRSexp(Module._CDR(this.ptr));
  }
  get tag(): RProxy {
    return wrapRSexp(Module._TAG(this.ptr));
  }
}

class RProxyClosure extends RProxy {
  _call(args: Array<any>): RProxy {
    // TODO: This needs to be tidied up and be made to work with other argument types
    let call = Module._Rf_allocVector(SEXPTYPE.LANGSXP, args.length + 1);
    let c = call;
    Module._SETCAR(call, this.ptr);
    for (let i = 0; i < args.length; i++) {
      c = Module._CDR(c);
      Module._SETCAR(c, Module._Rf_ScalarReal(args[i]));
    }
    return wrapRSexp(Module._Rf_eval(call, Module._CLOENV(this.ptr)));
  }
}

class RProxyVector extends RProxy {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }
  _valAtIdx(idx: number) {
    return wrapRSexp(Module._VECTOR_ELT(this.ptr, idx));
  }
  toJs(): ImplicitTypes {
    const list: { [keys: string | number]: ImplicitTypes } = {};
    for (let idx = 0; idx < this.length; idx++) {
      const attrs = (this.attrs as RProxyPairlist).toJs();
      const listIdx = 'names' in attrs ? (attrs['names'] as Array<string>)[idx] : idx + 1;
      list[listIdx] = this._valAtIdx(idx).toJs();
    }
    return list;
  }
}

type logical = boolean | 'NA';
class RProxyLogical extends RProxyVector {
  toJs(): logical | Array<logical> {
    const valAtIdx = (idx: number) => {
      const val = getValue(Module._LOGICAL(this.ptr) + 4 * idx, 'i32');
      if (val === 0) {
        return false;
      } else if (val === 1) {
        return true;
      }
      return 'NA';
    };
    if (this.length === 1) {
      return valAtIdx(0);
    } else {
      return Array.from({ length: this.length }, (_, idx) => valAtIdx(idx));
    }
  }
  get convertImplicitly(): boolean {
    return this.attrs.isNil;
  }
}

class RProxyInt extends RProxyVector {
  toJs(): number | ArrayBufferView {
    if (this.length === 1) {
      return getValue(Module._INTEGER(this.ptr), 'i32');
    } else {
      const arrView = Module.HEAP32.subarray(
        Module._INTEGER(this.ptr) / 4,
        Module._INTEGER(this.ptr) / 4 + this.length
      );
      return arrView;
    }
  }
  get convertImplicitly(): boolean {
    return this.attrs.isNil;
  }
}

class RProxyReal extends RProxyVector {
  toJs(): number | ArrayBufferView | { [keys: string | number]: ImplicitTypes } {
    if (this.attrs.isNil) {
      return this.value;
    } else {
      const list: { [keys: string | number]: ImplicitTypes } = {};
      for (let idx = 0; idx < this.length; idx++) {
        const attrs = (this.attrs as RProxyPairlist).toJs();
        const listIdx = 'names' in attrs ? (attrs['names'] as Array<string>)[idx] : idx + 1;
        list[listIdx] = getValue(Module._REAL(this.ptr) + 8 * idx, 'double');
      }
      return list;
    }
  }
  get value(): number | ArrayBufferView {
    if (this.length === 1) {
      return getValue(Module._REAL(this.ptr), 'double');
    } else {
      const arrView = Module.HEAPF64.subarray(
        Module._REAL(this.ptr) / 8,
        Module._REAL(this.ptr) / 8 + this.length
      );
      return arrView;
    }
  }
  get convertImplicitly(): boolean {
    return this.attrs.isNil;
  }
}

class RProxyComplex extends RProxyVector {
  toJs(): Complex | Array<Complex> {
    const valAtIdx = (idx: number) => {
      return {
        re: getValue(Module._COMPLEX(this.ptr) + 8 * (idx * 2), 'double'),
        im: getValue(Module._COMPLEX(this.ptr) + 8 * (idx * 2 + 1), 'double'),
      };
    };
    if (this.length === 1) {
      return valAtIdx(0);
    } else {
      return Array.from({ length: this.length }, (_, idx) => valAtIdx(idx));
    }
  }
  get convertImplicitly(): boolean {
    return this.attrs.isNil;
  }
}

class RProxyChar extends RProxy {
  toJs(): string {
    // eslint-disable-next-line new-cap
    return UTF8ToString(Module._R_CHAR(this.ptr));
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RProxyStr extends RProxyVector {
  toJs(): string | Array<string> {
    const valAtIdx = (idx: number) => {
      // eslint-disable-next-line new-cap
      return UTF8ToString(Module._R_CHAR(Module._STRING_ELT(this.ptr, idx)));
    };
    if (this.length === 1) {
      return valAtIdx(0);
    } else {
      return Array.from({ length: this.length }, (_, idx) => valAtIdx(idx));
    }
  }
  get convertImplicitly(): boolean {
    return this.attrs.isNil;
  }
}

class RProxyRaw extends RProxyVector {
  toJs(): Uint8Array {
    const arrView = Module.HEAPU8.subarray(
      Module._RAW(this.ptr),
      Module._RAW(this.ptr) + this.length
    );
    return arrView;
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RProxyEnv extends RProxy {
  get frame(): RProxy {
    return wrapRSexp(Module._FRAME(this.ptr));
  }
}

function getRProxyClass(type: SEXPTYPE): typeof RProxy {
  const typeClasses: { [key: number]: typeof RProxy } = {
    [SEXPTYPE.NILSXP]: RProxyNil,
    [SEXPTYPE.LISTSXP]: RProxyPairlist,
    [SEXPTYPE.VECSXP]: RProxyVector,
    [SEXPTYPE.CLOSXP]: RProxyClosure,
    [SEXPTYPE.ENVSXP]: RProxyEnv,
    [SEXPTYPE.LGLSXP]: RProxyLogical,
    [SEXPTYPE.INTSXP]: RProxyInt,
    [SEXPTYPE.REALSXP]: RProxyReal,
    [SEXPTYPE.CPLXSXP]: RProxyComplex,
    [SEXPTYPE.STRSXP]: RProxyStr,
    [SEXPTYPE.RAWSXP]: RProxyRaw,
    [SEXPTYPE.SYMSXP]: RProxySymbol,
    [SEXPTYPE.CHARSXP]: RProxyChar,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  throw new TypeError(`RProxy SEXP type ${SEXPTYPE[type]} has not yet been implemented.`);
}

export function wrapRSexp(ptr: number): RProxy {
  const type = Module._TYPEOF(ptr);
  return new (getRProxyClass(type))(ptr);
}
