import type { Module } from './utils';

declare let Module: Module;

export enum SexpType {
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

export enum RTargetType {
  CODE = 'CODE',
  RAW = 'RAW',
  SEXPPTR = 'SEXPPTR',
}

export type RCodeObj = {
  obj: string;
  type: RTargetType.CODE;
};
export type RRawObj = {
  obj: RawTypes;
  type: RTargetType.RAW;
};
export type RSexpPtr = {
  obj: RPtr;
  type: RTargetType.SEXPPTR;
};
export type RTargetObj = RCodeObj | RRawObj | RSexpPtr;

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

export function createRSexp(target: RTargetObj): RSexp {
  if (typeof target.obj === 'number') {
    const ptr = Module._Rf_ScalarReal(target.obj);
    return new RSexpReal(ptr);
  } else if (typeof target.obj === 'string') {
    const str = allocateUTF8(target.obj);
    const ptr = Module._Rf_mkString(str);
    Module._free(str);
    return new RSexpStr(ptr);
  }
  return new RSexpNil(0);
}

export class RSexp {
  ptr: RPtr;
  constructor(ptr: RPtr) {
    this.ptr = ptr;
  }
  get [Symbol.toStringTag](): string {
    return `RSexp:${this.typeName}`;
  }
  get type(): SexpType {
    return Module._TYPEOF(this.ptr);
  }
  get typeName(): string {
    return SexpType[this.type];
  }
  get convertImplicitly(): boolean {
    return false;
  }
  get attrs(): RSexp {
    return wrapRSexp(Module._ATTRIB(this.ptr));
  }
  get isNil(): boolean {
    return Module._TYPEOF(this.ptr) === SexpType.NILSXP;
  }
  getDollar(prop: string): RSexp | RawTypes {
    throw new Error('The $ operator is not yet supported for this R object');
  }
  getIdx(idx: number): RSexp | RawTypes {
    throw new Error('This R object cannot be indexed');
  }
  toJs(): RawTypes {
    throw new Error('JS conversion for this R object is not yet supported');
  }
  _set(prop: string, value: RSexp) {
    throw new Error('Setting this R object is not yet supported');
  }
  _call(_args: Array<any>): RSexp {
    throw new Error('This R object cannot be called');
  }
}

export class RSexpNil extends RSexp {
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
    for (let next = this.ptr; Module._TYPEOF(next) !== SexpType.NILSXP; next = Module._CDR(next)) {
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
  _call(args: Array<RTargetObj>): RSexp {
    // TODO: This needs to be tidied up and be made to work with other argument types
    const call = Module._Rf_allocVector(SexpType.LANGSXP, args.length + 1);
    let c = call;
    Module._SETCAR(call, this.ptr);
    for (let i = 0; i < args.length; i++) {
      c = Module._CDR(c);
      Module._SETCAR(c, createRSexp(args[i]).ptr);
    }
    return wrapRSexp(Module._Rf_eval(call, Module._CLOENV(this.ptr)));
  }
}

class RSexpVector extends RSexp {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }
  getIdx(idx: number): RSexp | RawTypes {
    return wrapRSexp(Module._VECTOR_ELT(this.ptr, idx));
  }
  toJs(): RawTypes {
    const list: { [keys: string | number]: RawTypes } = {};
    for (let idx = 0; idx < this.length; idx++) {
      const attrs = (this.attrs as RSexpPairlist).toJs();
      const listIdx = 'names' in attrs ? (attrs['names'] as Array<string>)[idx] : idx + 1;
      list[listIdx] = wrapRSexp(Module._VECTOR_ELT(this.ptr, idx)).toJs();
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
  #getIdxValue(idx: number): number {
    return this.#arrView[idx];
  }
  #getIdxName(idx: number): string | number {
    const attrs = (this.attrs as RSexpPairlist).toJs();
    return 'names' in attrs ? (attrs['names'] as Array<string>)[idx] : idx + 1;
  }
  get #arrView() {
    return Module.HEAPF64.subarray(
      Module._REAL(this.ptr) / 8,
      Module._REAL(this.ptr) / 8 + this.length
    );
  }
  toJs(): number | Float64Array | { [keys: string | number]: RawTypes } {
    if (this.attrs.isNil) {
      return this.value;
    } else {
      const list: { [keys: string | number]: RawTypes } = {};
      for (let idx = 0; idx < this.length; idx++) {
        list[this.#getIdxName(idx)] = this.#getIdxValue(idx);
      }
      return list;
    }
  }
  getIdx(idx: number): RawTypes {
    return this.attrs.isNil
      ? this.#getIdxValue(idx)
      : { [this.#getIdxName(idx)]: this.#getIdxValue(idx) };
  }
  getDollar(prop: string): RawTypes {
    if (this.attrs.isNil) {
      return undefined;
    }
    const attrs = this.attrs.toJs();
    if (attrs && typeof attrs === 'object' && 'names' in attrs) {
      const idx = (attrs.names as string[]).indexOf(prop);
      return { [this.#getIdxName(idx)]: this.#getIdxValue(idx) };
    }
  }
  _set(prop: string, value: RSexpReal) {
    if (isNaN(Number(prop))) {
      const attrs = this.attrs.toJs();
      if (attrs && typeof attrs === 'object' && 'names' in attrs) {
        const idx = (attrs.names as string[]).indexOf(prop);
        this.#arrView[idx] = value.value as number;
      }
    } else {
      this.#arrView[Number(prop)] = value.value as number;
    }
  }
  get value(): number | Float64Array {
    if (this.length === 1) {
      return this.#getIdxValue(0);
    } else {
      return this.#arrView;
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

function getRSexpClass(type: SexpType): typeof RSexp {
  const typeClasses: { [key: number]: typeof RSexp } = {
    [SexpType.NILSXP]: RSexpNil,
    [SexpType.LISTSXP]: RSexpPairlist,
    [SexpType.VECSXP]: RSexpVector,
    [SexpType.CLOSXP]: RSexpClosure,
    [SexpType.ENVSXP]: RSexpEnv,
    [SexpType.LGLSXP]: RSexpLogical,
    [SexpType.INTSXP]: RSexpInt,
    [SexpType.REALSXP]: RSexpReal,
    [SexpType.CPLXSXP]: RSexpComplex,
    [SexpType.STRSXP]: RSexpStr,
    [SexpType.RAWSXP]: RSexpRawdata,
    [SexpType.SYMSXP]: RSexpSymbol,
    [SexpType.CHARSXP]: RSexpChar,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  throw new TypeError(`RSexp SEXP type ${SexpType[type]} has not yet been implemented.`);
}

export function wrapRSexp(ptr: RPtr): RSexp {
  const type = Module._TYPEOF(ptr);
  return new (getRSexpClass(type))(ptr);
}
