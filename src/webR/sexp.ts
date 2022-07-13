import type { Module } from './utils';

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

export type RPtr = number;

type RSexpRaw = {
  obj: RawTypes;
  raw?: true;
};
type RSexpPtr = {
  obj: RPtr;
  raw?: false;
};
export type RSexpObj = RSexpRaw | RSexpPtr;

export type RCallInfo = {
  name: string | symbol;
  args: Array<unknown>;
};

type Complex = {
  re: number;
  im: number;
};

export type RawTypes =
  | number
  | string
  | boolean
  | undefined
  | Complex
  | Error
  | ArrayBuffer
  | ArrayBufferView
  | Array<RawTypes>
  | Map<RawTypes, RawTypes>
  | Set<RawTypes>
  | { [key: string]: RawTypes };

export class RSexp {
  ptr: RPtr;
  constructor(ptr: number) {
    this.ptr = ptr;
  }
  get [Symbol.toStringTag](): string {
    return `RSexp:${this.typeName}`;
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
  get attrs(): RSexp {
    return wrapRSexp(Module._ATTRIB(this.ptr));
  }
  get isNil(): boolean {
    return Module._TYPEOF(this.ptr) === SEXPTYPE.NILSXP;
  }
  toJs(): RawTypes {
    throw new TypeError('JS conversion for this R object is not supported.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _call(_args: Array<any>): RSexp {
    throw new Error('This R object cannot be called.');
  }
}

class RSexpNil extends RSexp {
  toJs(): RawTypes {
    return undefined;
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RSexpSymbol extends RSexp {
  toJs(): RawTypes {
    return {
      printname: this.printname.toJs(),
      // symvalue: this.symvalue.toJs()
      internal: this.internal.toJs(),
    };
  }
  get printname(): RSexpChar {
    return wrapRSexp(Module._PRINTNAME(this.ptr)) as RSexpChar;
  }
  get symvalue(): RSexp {
    return wrapRSexp(Module._SYMVALUE(this.ptr));
  }
  get internal(): RSexp {
    return wrapRSexp(Module._INTERNAL(this.ptr));
  }
}

class RSexpPairlist extends RSexp {
  toJs(): { [key: string]: RawTypes } {
    const d: { [key: string]: RawTypes } = {};
    let v: RSexp = wrapRSexp(Module._CAR(this.ptr));
    for (let next = this.ptr; Module._TYPEOF(next) !== SEXPTYPE.NILSXP; next = Module._CDR(next)) {
      v = wrapRSexp(Module._CAR(next));
      d[(wrapRSexp(Module._TAG(next)) as RSexpSymbol).printname.toJs()] = v.toJs();
    }
    return d;
  }
  get car(): RSexp {
    return wrapRSexp(Module._CAR(this.ptr));
  }
  get cdr(): RSexp {
    return wrapRSexp(Module._CDR(this.ptr));
  }
  get tag(): RSexp {
    return wrapRSexp(Module._TAG(this.ptr));
  }
}

class RSexpClosure extends RSexp {
  _call(args: Array<any>): RSexp {
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

class RSexpVector extends RSexp {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }
  _valAtIdx(idx: number) {
    return wrapRSexp(Module._VECTOR_ELT(this.ptr, idx));
  }
  toJs(): RawTypes {
    const list: { [keys: string | number]: RawTypes } = {};
    for (let idx = 0; idx < this.length; idx++) {
      const attrs = (this.attrs as RSexpPairlist).toJs();
      const listIdx = 'names' in attrs ? (attrs['names'] as Array<string>)[idx] : idx + 1;
      list[listIdx] = this._valAtIdx(idx).toJs();
    }
    return list;
  }
}

type logical = boolean | 'NA';
class RSexpLogical extends RSexpVector {
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

class RSexpInt extends RSexpVector {
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

class RSexpReal extends RSexpVector {
  toJs(): number | ArrayBufferView | { [keys: string | number]: RawTypes } {
    if (this.attrs.isNil) {
      return this.value;
    } else {
      const list: { [keys: string | number]: RawTypes } = {};
      for (let idx = 0; idx < this.length; idx++) {
        const attrs = (this.attrs as RSexpPairlist).toJs();
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

class RSexpComplex extends RSexpVector {
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

class RSexpChar extends RSexp {
  toJs(): string {
    // eslint-disable-next-line new-cap
    return UTF8ToString(Module._R_CHAR(this.ptr));
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RSexpStr extends RSexpVector {
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

class RSexpRawdata extends RSexpVector {
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

class RSexpEnv extends RSexp {
  get frame(): RSexp {
    return wrapRSexp(Module._FRAME(this.ptr));
  }
}

function getRSexpClass(type: SEXPTYPE): typeof RSexp {
  const typeClasses: { [key: number]: typeof RSexp } = {
    [SEXPTYPE.NILSXP]: RSexpNil,
    [SEXPTYPE.LISTSXP]: RSexpPairlist,
    [SEXPTYPE.VECSXP]: RSexpVector,
    [SEXPTYPE.CLOSXP]: RSexpClosure,
    [SEXPTYPE.ENVSXP]: RSexpEnv,
    [SEXPTYPE.LGLSXP]: RSexpLogical,
    [SEXPTYPE.INTSXP]: RSexpInt,
    [SEXPTYPE.REALSXP]: RSexpReal,
    [SEXPTYPE.CPLXSXP]: RSexpComplex,
    [SEXPTYPE.STRSXP]: RSexpStr,
    [SEXPTYPE.RAWSXP]: RSexpRawdata,
    [SEXPTYPE.SYMSXP]: RSexpSymbol,
    [SEXPTYPE.CHARSXP]: RSexpChar,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  throw new TypeError(`RSexp SEXP type ${SEXPTYPE[type]} has not yet been implemented.`);
}

export function wrapRSexp(ptr: number): RSexp {
  const type = Module._TYPEOF(ptr);
  return new (getRSexpClass(type))(ptr);
}
