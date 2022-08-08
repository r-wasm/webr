import type { Module } from './utils';

declare let Module: Module;

export enum RType {
  Null = 0,
  Symbol,
  Pairlist,
  Closure,
  Environment,
  Promise,
  Call,
  Special,
  Builtin,
  String,
  Logical,
  Integer = 13,
  Double,
  Complex,
  Character,
  Dots,
  Any,
  List,
  Expression,
  Bytecode,
  Pointer,
  Weakref,
  Raw,
  S4,
  New = 30,
  Free = 31,
  Function = 99,
}

export type RPtr = number;

export enum RTargetType {
  CODE = 'CODE',
  RAW = 'RAW',
  PTR = 'PTR',
}

export type RCodeObj = {
  data: {
    code: string;
    env: RTargetObj | undefined;
  };
  type: RTargetType.CODE;
};
export type RRawObj = {
  data: RawTypes;
  type: RTargetType.RAW;
};
export type RPtrObj = {
  data: RPtr;
  type: RTargetType.PTR;
};
export type RTargetObj = RCodeObj | RRawObj | RPtrObj;

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

export class RObj {
  ptr: RPtr;
  constructor(target: RPtr | RTargetObj) {
    this.ptr = RObj.R_NilValue;
    if (typeof target === 'number') {
      // We have a number, assume it is an RPtr to an RObj
      this.ptr = target;
    } else if (target.type === RTargetType.PTR) {
      // We have an RPtrObj, wrap using the RPtr within
      return RObj.wrap(target.data);
    } else if (typeof target.data === 'number') {
      const ptr = Module._Rf_ScalarReal(target.data);
      return new RObjReal(ptr);
    } else if (typeof target.data === 'string') {
      const str = allocateUTF8(target.data);
      const ptr = Module._Rf_mkString(str);
      Module._free(str);
      return new RObjStr(ptr);
    } else if (typeof target.data === 'boolean') {
      const ptr = Module._Rf_ScalarLogical(target.data);
      return new RObjLogical(ptr);
    } else if (Array.isArray(target.data) && target.data.some((el) => typeof el === 'string')) {
      // Create a vector of strings
      const robjVec = Module._Rf_allocVector(RType.Character, target.data.length);
      target.data.forEach((el, idx) => {
        const str = allocateUTF8(String(el));
        const ptr = Module._Rf_mkChar(str);
        Module._free(str);
        Module._SET_STRING_ELT(robjVec, idx, ptr);
      });
      return RObj.wrap(robjVec);
    } else if (Array.isArray(target.data) && target.data.some((el) => typeof el === 'number')) {
      // Create a vector of reals
      const robjVec = Module._Rf_allocVector(RType.Double, target.data.length);
      target.data.forEach((el, idx) =>
        setValue(Module._REAL(robjVec) + 8 * idx, Number(el), 'double')
      );
      return RObj.wrap(robjVec);
    } else if (Array.isArray(target.data)) {
      // Create a vector of logicals
      const robjVec = Module._Rf_allocVector(RType.Logical, target.data.length);
      target.data.forEach((el, idx) => setValue(Module._LOGICAL(robjVec) + 4 * idx, el, 'i32'));
      return RObj.wrap(robjVec);
    }
  }
  get [Symbol.toStringTag](): string {
    return `RObj:${this.typeName}`;
  }
  get type(): RType {
    return Module._TYPEOF(this.ptr);
  }
  get typeName(): string {
    return RType[this.type];
  }
  get convertImplicitly(): boolean {
    return false;
  }
  get attrs(): RObj {
    return RObj.wrap(Module._ATTRIB(this.ptr));
  }
  get isNil(): boolean {
    return Module._TYPEOF(this.ptr) === RType.Null;
  }
  getDollar(prop: string): RObj | RawTypes {
    throw new Error('The $ operator is not yet supported for this R object');
  }
  getIdx(idx: number): RObj | RawTypes {
    throw new Error('This R object cannot be indexed');
  }
  toJs(): RawTypes {
    throw new Error('JS conversion for this R object is not yet supported');
  }
  _set(prop: string, value: RObj) {
    throw new Error('Setting this R object is not yet supported');
  }
  _call(_args: Array<RObj>): RObj {
    throw new Error('This R object cannot be called');
  }
  static get R_GlobalEnv(): RPtr {
    return getValue(Module._R_GlobalEnv, '*');
  }
  static get R_EmptyEnv(): RPtr {
    return getValue(Module._R_EmptyEnv, '*');
  }
  static get R_BaseEnv(): RPtr {
    return getValue(Module._R_BaseEnv, '*');
  }
  static get R_NilValue(): RPtr {
    return getValue(Module._R_NilValue, '*');
  }
  static get R_UnboundValue(): RPtr {
    return getValue(Module._R_UnboundValue, '*');
  }
  static wrap(ptr: RPtr): RObj {
    const type = Module._TYPEOF(ptr);
    return new (getRObjClass(type))(ptr);
  }
}

export class RObjNil extends RObj {
  toJs(): RawTypes {
    return undefined;
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RObjSymbol extends RObj {
  toJs(): RawTypes {
    return {
      printname: this.printname.toJs(),
      // symvalue: this.symvalue.toJs()
      internal: this.internal.toJs(),
    };
  }
  get printname(): RObjChar {
    return RObj.wrap(Module._PRINTNAME(this.ptr)) as RObjChar;
  }
  get symvalue(): RObj {
    return RObj.wrap(Module._SYMVALUE(this.ptr));
  }
  get internal(): RObj {
    return RObj.wrap(Module._INTERNAL(this.ptr));
  }
}

class RObjPairlist extends RObj {
  toJs(): { [key: string]: RawTypes } {
    const d: { [key: string]: RawTypes } = {};
    let v: RObj = RObj.wrap(Module._CAR(this.ptr));
    for (let next = this.ptr; Module._TYPEOF(next) !== RType.Null; next = Module._CDR(next)) {
      v = RObj.wrap(Module._CAR(next));
      d[(RObj.wrap(Module._TAG(next)) as RObjSymbol).printname.toJs()] = v.toJs();
    }
    return d;
  }
  get car(): RObj {
    return RObj.wrap(Module._CAR(this.ptr));
  }
  get cdr(): RObj {
    return RObj.wrap(Module._CDR(this.ptr));
  }
  get tag(): RObj {
    return RObj.wrap(Module._TAG(this.ptr));
  }
}

class RObjClosure extends RObj {
  _call(args: Array<RObj>): RObj {
    const call = Module._Rf_allocVector(RType.Call, args.length + 1);
    let c = call;
    Module._SETCAR(call, this.ptr);
    for (let i = 0; i < args.length; i++) {
      c = Module._CDR(c);
      Module._SETCAR(c, args[i].ptr);
    }
    return RObj.wrap(Module._Rf_eval(call, Module._CLOENV(this.ptr)));
  }
}

class RObjFunction extends RObj {
  _call(args: Array<RObj>): RObj {
    const call = Module._Rf_allocVector(RType.Call, args.length + 1);
    let c = call;
    Module._SETCAR(call, this.ptr);
    for (let i = 0; i < args.length; i++) {
      c = Module._CDR(c);
      Module._SETCAR(c, args[i].ptr);
    }
    return RObj.wrap(Module._Rf_eval(call, RObj.R_GlobalEnv));
  }
}

class RObjVector extends RObj {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }
  getIdx(idx: number): RObj | RawTypes {
    return RObj.wrap(Module._VECTOR_ELT(this.ptr, idx));
  }
  toJs(): RawTypes {
    const list: { [keys: string | number]: RawTypes } = {};
    for (let idx = 0; idx < this.length; idx++) {
      const attrs = (this.attrs as RObjPairlist).toJs();
      const listIdx = 'names' in attrs ? (attrs['names'] as Array<string>)[idx] : idx + 1;
      list[listIdx] = RObj.wrap(Module._VECTOR_ELT(this.ptr, idx)).toJs();
    }
    return list;
  }
}

type logical = boolean | 'NA';
class RObjLogical extends RObjVector {
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

class RObjInt extends RObjVector {
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

class RObjReal extends RObjVector {
  #getIdxValue(idx: number): number {
    return this.#arrView[idx];
  }
  #getIdxName(idx: number): string | number {
    const attrs = (this.attrs as RObjPairlist).toJs();
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
  _set(prop: string, value: RObjReal) {
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

class RObjComplex extends RObjVector {
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

class RObjChar extends RObj {
  toJs(): string {
    return UTF8ToString(Module._R_CHAR(this.ptr));
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RObjStr extends RObjVector {
  toJs(): string | Array<string> {
    const valAtIdx = (idx: number) => {
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

class RObjRawdata extends RObjVector {
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

class RObjEnv extends RObj {
  get ls(): RObj {
    return RObj.wrap(Module._R_lsInternal(this.ptr, true));
  }
  get frame(): RObj {
    return RObj.wrap(Module._FRAME(this.ptr));
  }
  getDollar(prop: string): RObj {
    const str = allocateUTF8(prop);
    const strPtr = Module._Rf_installTrChar(Module._STRING_ELT(Module._Rf_mkString(str), 0));
    Module._free(str);
    const val = RObj.wrap(Module._Rf_findVarInFrame(this.ptr, strPtr));
    if (val.ptr === RObj.R_UnboundValue) {
      return new RObjNil(RObj.R_NilValue);
    }
    return val;
  }
}

function getRObjClass(type: RType): typeof RObj {
  const typeClasses: { [key: number]: typeof RObj } = {
    [RType.Null]: RObjNil,
    [RType.Pairlist]: RObjPairlist,
    [RType.List]: RObjVector,
    [RType.Closure]: RObjClosure,
    [RType.Special]: RObjFunction,
    [RType.Builtin]: RObjFunction,
    [RType.Function]: RObjFunction,
    [RType.Environment]: RObjEnv,
    [RType.Logical]: RObjLogical,
    [RType.Integer]: RObjInt,
    [RType.Double]: RObjReal,
    [RType.Complex]: RObjComplex,
    [RType.Character]: RObjStr,
    [RType.Raw]: RObjRawdata,
    [RType.Symbol]: RObjSymbol,
    [RType.String]: RObjChar,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  throw new TypeError(`RObj type ${RType[type]} has not yet been implemented.`);
}
