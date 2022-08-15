import type { Module } from './module';

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

type Nullable<T> = T | RObjNull;

type Complex = {
  re: number;
  im: number;
};

export type RawType =
  | number
  | string
  | boolean
  | undefined
  | null
  | Complex
  | Error
  | ArrayBuffer
  | ArrayBufferView
  | Array<RawType>
  | Map<RawType, RawType>
  | Set<RawType>
  | { [key: string]: RawType };

export class RObj {
  ptr: RPtr;

  constructor(target: RPtr) {
    this.ptr = target;
  }

  get [Symbol.toStringTag](): string {
    return `RObj:${RType[this.type]}`;
  }

  get type(): RType {
    return Module._TYPEOF(this.ptr);
  }

  protect(): void {
    this.ptr = Module._Rf_protect(this.ptr);
  }

  unprotect(): void {
    Module._Rf_unprotect_ptr(this.ptr);
  }

  isNull(): this is RObjNull {
    return Module._TYPEOF(this.ptr) === RType.Null;
  }

  isUnbound(): boolean {
    return this.ptr === RObj.unboundValue.ptr;
  }

  attrs(): Nullable<RObjPairlist> {
    return RObj.wrap(Module._ATTRIB(this.ptr)) as RObjPairlist;
  }

  names(): string[] | undefined {
    const attrs = this.attrs();
    if (attrs.isNull()) {
      return undefined;
    }
    const names = attrs.get('names') as Nullable<RObjCharacter>;
    if (names.isNull()) {
      return undefined;
    }
    return names.toJs();
  }

  includes(name: string) {
    const names = this.names();
    return names && names.includes(name);
  }

  toJs(): RawType {
    throw new Error('This R object cannot be converted to JS');
  }

  static get globalEnv(): RObj {
    return RObj.wrap(getValue(Module._R_GlobalEnv, '*'));
  }

  static get emptyEnv(): RObj {
    return RObj.wrap(getValue(Module._R_EmptyEnv, '*'));
  }

  static get baseEnv(): RObj {
    return RObj.wrap(getValue(Module._R_BaseEnv, '*'));
  }

  static get null(): RObjNull {
    return new RObjNull(getValue(Module._R_NilValue, '*'));
  }

  static get unboundValue(): RObj {
    return RObj.wrap(getValue(Module._R_UnboundValue, '*'));
  }

  static wrap(ptr: RPtr): RObj {
    const type = Module._TYPEOF(ptr);
    return new (getRObjClass(type))(ptr);
  }

  static protect<T extends RObj>(obj: T): T {
    return RObj.wrap(Module._Rf_protect(obj.ptr)) as T;
  }

  static unprotect(n: number): void {
    Module._Rf_unprotect(n);
  }

  static unprotectPtr(obj: RObj): void {
    Module._Rf_unprotect_ptr(obj.ptr);
  }
}

export class RObjNull extends RObj {
  toJs(): null {
    return null;
  }
}

class RObjSymbol extends RObj {
  toJs(): RawType {
    if (this.isUnbound()) {
      return undefined;
    }
    return this.toObject();
  }
  toObject(): {
    printname: string | undefined;
    symvalue: RPtr | undefined;
    internal: RPtr | undefined;
  } {
    return {
      printname: this.printname().isUnbound() ? undefined : this.printname().toJs(),
      symvalue: this.symvalue().isUnbound() ? undefined : this.symvalue().ptr,
      internal: this.internal().isNull() ? undefined : this.internal().ptr,
    };
  }
  printname(): RObjString {
    return new RObjString(Module._PRINTNAME(this.ptr));
  }
  symvalue(): RObj {
    return RObj.wrap(Module._SYMVALUE(this.ptr));
  }
  internal(): RObj {
    return RObj.wrap(Module._INTERNAL(this.ptr));
  }
}

class RObjPairlist extends RObj {
  get(name: string): Nullable<RObj> {
    for (let next = this as Nullable<RObjPairlist>; !next.isNull(); next = next.cdr()) {
      const symbol = next.tag();
      if (!symbol.isNull() && symbol.toObject().printname === name) {
        return next.car();
      }
    }
    return RObj.null;
  }

  includes(name: string): boolean {
    return !this.get(name).isNull();
  }

  toObject(): { [key: string]: RawType } {
    const d: { [key: string]: RawType } = {};
    for (let next = this as Nullable<RObjPairlist>; !next.isNull(); next = next.cdr()) {
      const symbol = next.tag();
      if (!symbol.isNull() && symbol.printname()) {
        d[symbol.printname().toJs()] = next.car().toJs();
      } else {
        d[Object.keys(d).length] = next.car().toJs();
      }
    }
    return d;
  }

  setcar(obj: RObj): void {
    Module._SETCAR(this.ptr, obj.ptr);
  }

  car(): RObj {
    return RObj.wrap(Module._CAR(this.ptr));
  }

  cdr(): Nullable<RObjPairlist> {
    return RObj.wrap(Module._CDR(this.ptr)) as Nullable<RObjPairlist>;
  }

  tag(): Nullable<RObjSymbol> {
    return RObj.wrap(Module._TAG(this.ptr)) as Nullable<RObjSymbol>;
  }
}

class RObjList extends RObj {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }

  getIndex(idx: number): RObj {
    return RObj.wrap(Module._VECTOR_ELT(this.ptr, idx));
  }

  get(idx: number | string): RObj {
    if (typeof idx === 'number') {
      return this.getIndex(idx);
    }
    const names = this.names();
    if (names && this.includes(idx)) {
      return this.getIndex(names.indexOf(idx));
    }
    return RObj.null;
  }

  toJs(): RawType[] {
    return this.toArray();
  }

  toArray(): RawType[] {
    return [...Array(this.length).keys()].map((i) => this.get(i).toJs());
  }
}

class RObjFunction extends RObj {
  _call(args: Array<RObj>): RObj {
    const call = RObj.protect(
      new RObjPairlist(Module._Rf_allocVector(RType.Call, args.length + 1))
    );
    call.setcar(this);
    let c = call.cdr();
    let i = 0;
    while (!c.isNull()) {
      c.setcar(args[i++]);
      c = c.cdr();
    }
    return RObj.wrap(Module._Rf_eval(call.ptr, RObj.globalEnv.ptr));
  }
}

class RObjString extends RObj {
  toJs(): string {
    return UTF8ToString(Module._R_CHAR(this.ptr));
  }
}

class RObjEnv extends RObj {
  ls(): string[] {
    return new RObjCharacter(Module._R_lsInternal(this.ptr, true)).toJs();
  }
  frame(): RObj {
    return RObj.wrap(Module._FRAME(this.ptr));
  }
  get(name: string): RObj {
    const char = allocateUTF8(name);
    const str = RObj.protect(RObj.wrap(Module._Rf_mkString(char)));
    const strPtr = Module._Rf_installTrChar(Module._STRING_ELT(str.ptr, 0));
    Module._free(char);
    const variable = RObj.wrap(Module._Rf_findVarInFrame(this.ptr, strPtr));
    RObj.unprotect(1);
    return variable;
  }
  includes(name: string) {
    return !this.get(name).isUnbound();
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

abstract class RObjAtomicVector extends RObj {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }

  abstract toArray(): TypedArray;

  toObject(): { [key: string | number]: RawType } {
    const names = this.names();
    return Object.fromEntries(
      [...Array(this.length).keys()].map((i) => [
        names && names[i] !== '' ? names[i] : i,
        this.getIndex(i),
      ])
    );
  }

  getIndex(idx: number): RawType {
    return this.toArray()[idx];
  }

  get(idx: number | string): RawType {
    if (typeof idx === 'number') {
      return this.getIndex(idx);
    }
    const names = this.names();
    if (names && this.includes(idx)) {
      return this.getIndex(names.indexOf(idx));
    }
    return undefined;
  }

  toJs(): RawType {
    return this.toArray();
  }
}

type RLogical = boolean | 'NA' | undefined;
class RObjLogical extends RObjAtomicVector {
  toArray(): Int32Array {
    return Module.HEAP32.subarray(
      Module._LOGICAL(this.ptr) / 4,
      Module._LOGICAL(this.ptr) / 4 + this.length
    );
  }
  getIndex(idx: number): RLogical {
    const elem = this.toArray()[idx];
    if (typeof elem === 'undefined') return undefined;
    if (elem === 0 || elem === 1) {
      return elem === 1;
    }
    return 'NA';
  }

  toJs(): RLogical[] {
    return Array.from({ length: this.length }, (_, idx) => this.getIndex(idx));
  }
}

class RObjInt extends RObjAtomicVector {
  toArray(): Int32Array {
    return Module.HEAP32.subarray(
      Module._INTEGER(this.ptr) / 4,
      Module._INTEGER(this.ptr) / 4 + this.length
    );
  }
}

class RObjReal extends RObjAtomicVector {
  toArray(): Float64Array {
    return Module.HEAPF64.subarray(
      Module._REAL(this.ptr) / 8,
      Module._REAL(this.ptr) / 8 + this.length
    );
  }
}

class RObjComplex extends RObjAtomicVector {
  toArray(): Float64Array {
    return Module.HEAPF64.subarray(
      Module._COMPLEX(this.ptr) / 8,
      Module._COMPLEX(this.ptr) / 8 + 2 * this.length
    );
  }
  getIndex(idx: number): Complex {
    return {
      re: this.toArray()[2 * idx],
      im: this.toArray()[2 * idx + 1],
    };
  }
  toJs(): Complex[] {
    return Array.from({ length: this.length }, (_, idx) => this.getIndex(idx));
  }
}

class RObjCharacter extends RObjAtomicVector {
  toArray(): Uint32Array {
    return Module.HEAPU32.subarray(
      Module._STRING_PTR(this.ptr) / 4,
      Module._STRING_PTR(this.ptr) / 4 + this.length
    );
  }
  getIndex(idx: number): string {
    return new RObjString(Module._STRING_ELT(this.ptr, idx)).toJs();
  }
  toJs(): string[] {
    return Array.from({ length: this.length }, (_, idx) => this.getIndex(idx));
  }
}

class RObjRawdata extends RObjAtomicVector {
  toArray(): Uint8Array {
    return Module.HEAPU8.subarray(Module._RAW(this.ptr), Module._RAW(this.ptr) + this.length);
  }
}

function getRObjClass(type: RType): typeof RObj {
  const typeClasses: { [key: number]: typeof RObj } = {
    [RType.Null]: RObjNull,
    [RType.Symbol]: RObjSymbol,
    [RType.Pairlist]: RObjPairlist,
    [RType.Closure]: RObjFunction,
    [RType.Environment]: RObjEnv,
    [RType.Call]: RObjPairlist,
    [RType.Special]: RObjFunction,
    [RType.Builtin]: RObjFunction,
    [RType.String]: RObjString,
    [RType.Logical]: RObjLogical,
    [RType.Integer]: RObjInt,
    [RType.Double]: RObjReal,
    [RType.Complex]: RObjComplex,
    [RType.Character]: RObjCharacter,
    [RType.List]: RObjList,
    [RType.Raw]: RObjRawdata,
    [RType.Function]: RObjFunction,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  return RObj;
}
