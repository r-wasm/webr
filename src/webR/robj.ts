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
      return new RObjCharacter(ptr);
    } else if (typeof target.data === 'boolean') {
      const ptr = Module._Rf_ScalarLogical(target.data);
      return new RObjLogical(ptr);
    } else if (typeof target.data === 'object' && 're' in target.data && 'im' in target.data) {
      const ptr = Module._Rf_allocVector(RType.Complex, 1);
      setValue(Module._COMPLEX(ptr), target.data.re, 'double');
      setValue(Module._COMPLEX(ptr) + 8, target.data.im, 'double');
      return new RObjComplex(ptr);
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
  get names(): string[] | undefined {
    if (this.attrs.isNil) {
      return undefined;
    }
    const attrs = this.attrs.toJs() as { [key: string]: RawTypes };
    return 'names' in attrs ? (attrs['names'] as string[]) : undefined;
  }
  get isNil(): boolean {
    return Module._TYPEOF(this.ptr) === RType.Null;
  }
  get isUnbound(): boolean {
    return this.ptr === RObj.R_UnboundValue;
  }
  extractIndex(idx: number): RObj | RawTypes {
    throw new Error('This R object is not subsettable');
  }
  extractName(name: string): RObj | RawTypes {
    throw new Error('This R object is not subsettable');
  }
  nameForIndex(idx: number): string | number {
    return this.names && this.names[idx] !== '' ? this.names[idx] : idx;
  }
  includes(name: string) {
    return this.names && this.names.includes(name);
  }
  toJs(): RawTypes {
    throw new Error('JS conversion for this R object is not yet supported');
  }
  toRObj(): RObj {
    return this;
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
      symvalue: this.symvalue.isUnbound ? undefined : this.symvalue.ptr,
      internal: this.internal.isNil ? undefined : this.internal.ptr,
    };
  }
  get printname(): RObjString {
    return RObj.wrap(Module._PRINTNAME(this.ptr)) as RObjString;
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
    let symbol: RObjSymbol;
    let v: RObj = RObj.wrap(Module._CAR(this.ptr));
    for (
      let next = this.ptr, idx = 0;
      Module._TYPEOF(next) !== RType.Null;
      next = Module._CDR(next), idx++
    ) {
      v = RObj.wrap(Module._CAR(next));
      symbol = RObj.wrap(Module._TAG(next)) as RObjSymbol;
      if (!symbol.isNil) {
        d[symbol.printname.toJs()] = v.toJs();
      } else {
        d[idx] = v.toJs();
      }
    }
    return d;
  }
  extractIndex(i: number): RObj {
    let v: RObj = RObj.wrap(Module._CAR(this.ptr));
    for (
      let next = this.ptr, idx = 0;
      Module._TYPEOF(next) !== RType.Null;
      next = Module._CDR(next), idx++
    ) {
      v = RObj.wrap(Module._CAR(next));
      if (idx === i) return v;
    }
    return RObj.wrap(RObj.R_NilValue);
  }
  extractName(name: string): RObj {
    let symbol: RObjSymbol;
    let v: RObj = RObj.wrap(Module._CAR(this.ptr));
    for (let next = this.ptr; Module._TYPEOF(next) !== RType.Null; next = Module._CDR(next)) {
      v = RObj.wrap(Module._CAR(next));
      symbol = RObj.wrap(Module._TAG(next)) as RObjSymbol;
      if (!symbol.isNil && symbol.printname.toJs() === name) {
        return v;
      }
    }
    return RObj.wrap(RObj.R_NilValue);
  }
  includes(name: string): boolean {
    let symbol: RObjSymbol;
    for (let next = this.ptr; Module._TYPEOF(next) !== RType.Null; next = Module._CDR(next)) {
      symbol = RObj.wrap(Module._TAG(next)) as RObjSymbol;
      if (!symbol.isNil && symbol.printname.toJs() === name) {
        return true;
      }
    }
    return false;
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

class RObjList extends RObj {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }
  get convertImplicitly(): boolean {
    return this.attrs.isNil;
  }
  extractIndex(idx: number): RObj {
    return RObj.wrap(Module._VECTOR_ELT(this.ptr, idx));
  }
  extractName(name: string): RObj {
    const idx = this.names ? this.names.indexOf(name) : -1;
    return idx < 0 ? RObj.wrap(RObj.R_NilValue) : this.extractIndex(idx);
  }
  toJs(): RawTypes {
    if (this.attrs.isNil) {
      return [...Array(this.length).keys()].map((i) => this.extractIndex(i).toJs());
    }
    return Object.fromEntries(
      [...Array(this.length).keys()].map((i) => [this.nameForIndex(i), this.extractIndex(i).toJs()])
    );
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

class RObjString extends RObj {
  toJs(): string {
    return UTF8ToString(Module._R_CHAR(this.ptr));
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
  extractName(name: string): RObj {
    const str = allocateUTF8(name);
    const strPtr = Module._Rf_installTrChar(Module._STRING_ELT(Module._Rf_mkString(str), 0));
    Module._free(str);
    return RObj.wrap(Module._Rf_findVarInFrame(this.ptr, strPtr));
  }
  includes(name: string) {
    return !this.extractName(name).isUnbound;
  }
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | Array<Complex>;

interface RObjVectorInterface {
  length: number;
  arrView: TypedArray;
  value: RawTypes | TypedArray;
  convertImplicitly: boolean;
  extractIndex: (idx: number) => RawTypes;
  extractName: (name: string) => RawTypes;
  toJs: () => RawTypes;
  _set: (prop: string, value: RObjVector) => void;
}

class RObjVector extends RObj implements RObjVectorInterface {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }
  get arrView(): TypedArray {
    throw new Error('Subclass of RObjVector must implement the arrView property');
  }
  get value(): RawTypes | TypedArray {
    if (this.length === 1) {
      return this.extractIndex(0);
    } else {
      return this.arrView;
    }
  }
  get convertImplicitly(): boolean {
    return this.attrs.isNil;
  }
  extractIndex(idx: number): RawTypes {
    return this.arrView[idx];
  }
  extractName(name: string): RawTypes {
    const idx = this.names ? this.names.indexOf(name) : -1;
    return idx < 0 ? undefined : this.extractIndex(idx);
  }
  toJs(): RawTypes {
    if (this.attrs.isNil) {
      return this.value;
    }
    return Object.fromEntries(
      [...Array(this.length).keys()].map((i) => [this.nameForIndex(i), this.extractIndex(i)])
    );
  }
  _set(prop: string, value: RObjVector) {
    if (![RType.Logical, RType.Integer, RType.Double, RType.Raw].includes(value.type)) {
      throw new Error('Attempt to set R vector element with non-numeric value');
    }
    if (isNaN(Number(prop))) {
      if (!this.names) {
        throw new Error('Attempt to set R vector element using non-existent key');
      }
      const idx = this.names.indexOf(prop);
      this.arrView[idx] = value.extractIndex(0) as number;
    } else {
      this.arrView[Number(prop)] = value.extractIndex(0) as number;
    }
  }
}

class RObjLogical extends RObjVector implements RObjVectorInterface {
  get arrView(): Int32Array {
    return Module.HEAP32.subarray(
      Module._LOGICAL(this.ptr) / 4,
      Module._LOGICAL(this.ptr) / 4 + this.length
    );
  }
  get value(): RawTypes | TypedArray {
    if (this.length === 1) {
      return this.extractIndex(0);
    } else {
      return Array.from({ length: this.length }, (_, idx) => this.extractIndex(idx));
    }
  }
  extractIndex(idx: number): boolean | 'NA' | undefined {
    if (typeof this.arrView[idx] === 'undefined') return undefined;
    if (this.arrView[idx] === 0 || this.arrView[idx] === 1) {
      return this.arrView[idx] === 1;
    }
    return 'NA';
  }
}

class RObjInt extends RObjVector implements RObjVectorInterface {
  get arrView() {
    return Module.HEAP32.subarray(
      Module._INTEGER(this.ptr) / 4,
      Module._INTEGER(this.ptr) / 4 + this.length
    );
  }
}

class RObjReal extends RObjVector implements RObjVectorInterface {
  get arrView() {
    return Module.HEAPF64.subarray(
      Module._REAL(this.ptr) / 8,
      Module._REAL(this.ptr) / 8 + this.length
    );
  }
}

class RObjComplex extends RObjVector implements RObjVectorInterface {
  get arrView() {
    return Module.HEAPF64.subarray(
      Module._COMPLEX(this.ptr) / 8,
      Module._COMPLEX(this.ptr) / 8 + 2 * this.length
    );
  }
  get value(): RawTypes | TypedArray {
    if (this.length === 1) {
      return this.extractIndex(0);
    } else {
      return Array.from({ length: this.length }, (_, idx) => this.extractIndex(idx));
    }
  }
  extractIndex(idx: number): Complex {
    return {
      re: this.arrView[2 * idx],
      im: this.arrView[2 * idx + 1],
    };
  }
  _set(prop: string, value: RObjVector) {
    if (value.type !== RType.Complex) {
      throw new Error('Attempt to set R complex vector element with non-complex value');
    }
    if (isNaN(Number(prop))) {
      if (!this.names) {
        throw new Error('Attempt to set R vector element using non-existent key');
      }
      const idx = this.names.indexOf(prop);
      this.arrView[2 * idx] = (value as RObjComplex).extractIndex(0).re;
      this.arrView[2 * idx + 1] = (value as RObjComplex).extractIndex(0).im;
    } else {
      const idx = Number(prop);
      this.arrView[2 * idx] = (value as RObjComplex).extractIndex(0).re;
      this.arrView[2 * idx + 1] = (value as RObjComplex).extractIndex(0).im;
    }
  }
}

class RObjCharacter extends RObjVector implements RObjVectorInterface {
  get arrView() {
    return Module.HEAPU32.subarray(
      Module._STRING_PTR(this.ptr) / 4,
      Module._STRING_PTR(this.ptr) / 4 + this.length
    );
  }
  get value(): RawTypes | TypedArray {
    if (this.length === 1) {
      return this.extractIndex(0);
    } else {
      return Array.from({ length: this.length }, (_, idx) => this.extractIndex(idx));
    }
  }
  extractIndex(idx: number): RawTypes {
    return UTF8ToString(Module._R_CHAR(Module._STRING_ELT(this.ptr, idx)));
  }
  _set(prop: string, value: RObjVector) {
    if (value.type !== RType.Character) {
      throw new Error('Attempt to set R character vector element with non-character value');
    }
    if (isNaN(Number(prop))) {
      if (!this.names) {
        throw new Error('Attempt to set R vector element using non-existent key');
      }
      const idx = this.names.indexOf(prop);
      Module._SET_STRING_ELT(this.ptr, idx, Module._STRING_ELT(value.ptr, idx));
    } else {
      const idx = Number(prop);
      Module._SET_STRING_ELT(this.ptr, idx, Module._STRING_ELT(value.ptr, idx));
    }
  }
}

class RObjRawdata extends RObjVector implements RObjVectorInterface {
  get arrView() {
    return Module.HEAPU8.subarray(Module._RAW(this.ptr), Module._RAW(this.ptr) + this.length);
  }
}

function getRObjClass(type: RType): typeof RObj {
  const typeClasses: { [key: number]: typeof RObj } = {
    [RType.Null]: RObjNil,
    [RType.Pairlist]: RObjPairlist,
    [RType.List]: RObjList,
    [RType.Closure]: RObjClosure,
    [RType.Special]: RObjFunction,
    [RType.Builtin]: RObjFunction,
    [RType.Function]: RObjFunction,
    [RType.Environment]: RObjEnv,
    [RType.Logical]: RObjLogical,
    [RType.Integer]: RObjInt,
    [RType.Double]: RObjReal,
    [RType.Complex]: RObjComplex,
    [RType.Character]: RObjCharacter,
    [RType.Raw]: RObjRawdata,
    [RType.Symbol]: RObjSymbol,
    [RType.String]: RObjString,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  throw new TypeError(`RObj type ${RType[type]} has not yet been implemented.`);
}
