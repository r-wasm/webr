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

  preserve(): void {
    Module._R_PreserveObject(this.ptr);
  }

  release(): void {
    Module._R_ReleaseObject(this.ptr);
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

  subset(prop: number | string): RObj {
    let idx: RPtr;
    let char: RPtr = 0;
    if (typeof prop === 'number') {
      idx = Module._Rf_protect(Module._Rf_ScalarInteger(prop));
    } else {
      char = allocateUTF8(prop);
      idx = Module._Rf_protect(Module._Rf_mkString(char));
    }
    const call = Module._Rf_protect(Module._Rf_lang3(RObj.bracketSymbol.ptr, this.ptr, idx));
    const sub = RObj.wrap(Module._Rf_eval(call, RObj.baseEnv.ptr));
    Module._Rf_unprotect(2);
    if (char) Module._free(char);
    return sub;
  }

  get(prop: number | string): RObj {
    let idx: RPtr;
    let char: RPtr = 0;
    if (typeof prop === 'number') {
      idx = Module._Rf_protect(Module._Rf_ScalarInteger(prop));
    } else {
      char = allocateUTF8(prop);
      idx = Module._Rf_protect(Module._Rf_mkString(char));
    }
    const call = Module._Rf_protect(Module._Rf_lang3(RObj.bracket2Symbol.ptr, this.ptr, idx));
    const sub = RObj.wrap(Module._Rf_eval(call, RObj.baseEnv.ptr));
    Module._Rf_unprotect(2);
    if (char) Module._free(char);
    return sub;
  }

  getDollar(prop: string): RObj {
    const char = allocateUTF8(prop);
    const idx = Module._Rf_protect(Module._Rf_mkString(char));
    const call = Module._Rf_protect(Module._Rf_lang3(RObj.dollarSymbol.ptr, this.ptr, idx));
    const sub = RObj.wrap(Module._Rf_eval(call, RObj.baseEnv.ptr));
    Module._Rf_unprotect(2);
    Module._free(char);
    return sub;
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

  static get bracketSymbol(): RObjSymbol {
    return new RObjSymbol(getValue(Module._R_BracketSymbol, '*'));
  }

  static get bracket2Symbol(): RObjSymbol {
    return new RObjSymbol(getValue(Module._R_Bracket2Symbol, '*'));
  }

  static get dollarSymbol(): RObjSymbol {
    return new RObjSymbol(getValue(Module._R_DollarSymbol, '*'));
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

  static preserveObject(obj: RObj): void {
    Module._R_PreserveObject(obj.ptr);
  }

  static releaseObject(obj: RObj): void {
    Module._R_ReleaseObject(obj.ptr);
  }
}

export class RObjNull extends RObj {
  toJs(): null {
    return null;
  }
}

export class RObjSymbol extends RObj {
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

export class RObjPairlist extends RObj {
  toObject(): { [key: string]: RawType } {
    const d: { [key: string]: RawType } = {};
    for (let next = this as Nullable<RObjPairlist>; !next.isNull(); next = next.cdr()) {
      const symbol = next.tag();
      if (!symbol.isNull()) {
        d[symbol.printname().toJs()] = next.car().toJs();
      } else {
        d[Object.keys(d).length + 1] = next.car().toJs();
      }
    }
    return d;
  }

  includes(name: string): boolean {
    return name in this.toObject();
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

  toJs(): RawType {
    return this.toObject();
  }
}

export class RObjList extends RObj {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }

  toObject(): { [key: string | number]: RawType } {
    const names = this.names();
    return Object.fromEntries(
      [...Array(this.length).keys()].map((i) => {
        const idx = names && names[i] !== '' ? names[i] : i + 1;
        return [idx, this.get(idx).toJs()];
      })
    );
  }

  toJs(): RawType {
    return this.toObject();
  }

  toArray(): RawType[] {
    return [...Array(this.length).keys()].map((i) => this.get(i + 1).toJs());
  }
}

export class RObjFunction extends RObj {
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

export class RObjString extends RObj {
  toJs(): string {
    return UTF8ToString(Module._R_CHAR(this.ptr));
  }
}

export class RObjEnv extends RObj {
  ls(all = false, sorted = true): string[] {
    return new RObjCharacter(Module._R_lsInternal3(this.ptr, all, sorted)).toJs();
  }

  names(): string[] {
    return this.ls(true, true);
  }

  frame(): RObj {
    return RObj.wrap(Module._FRAME(this.ptr));
  }

  subset(prop: number | string): RObj {
    if (typeof prop === 'number') {
      throw new Error('Object of type environment is not subsettable');
    }
    return this.getDollar(prop);
  }

  toObject(): { [key: string | number]: RawType } {
    const symbols = this.names();
    return Object.fromEntries(
      [...Array(symbols.length).keys()].map((i) => {
        return [symbols[i], this.getDollar(symbols[i]).toJs()];
      })
    );
  }

  toJs(): RawType {
    return this.toObject();
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

  get(prop: number | string): typeof this {
    return super.get(prop) as typeof this;
  }

  subset(prop: number | string): typeof this {
    return super.subset(prop) as typeof this;
  }

  getDollar(prop: string): RObj {
    throw new Error('$ operator is invalid for atomic vectors');
  }

  abstract toArray(): TypedArray;

  toObject(): { [key: string | number]: RawType } {
    const names = this.names();
    return Object.fromEntries(
      [...Array(this.length).keys()].map((i) => {
        const idx = names && names[i] !== '' ? names[i] : i + 1;
        return [idx, this.get(idx).toJs()];
      })
    );
  }

  toJs(): RawType {
    return this.toArray();
  }
}

type RLogical = boolean | 'NA' | undefined;
export class RObjLogical extends RObjAtomicVector {
  getLogical(idx: number): RLogical {
    return this.get(idx).toJs()[0];
  }

  toLogical(): RLogical {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getLogical(1);
  }

  toArray(): Int32Array {
    return Module.HEAP32.subarray(
      Module._LOGICAL(this.ptr) / 4,
      Module._LOGICAL(this.ptr) / 4 + this.length
    );
  }

  toJs(): RLogical[] {
    return Array.from({ length: this.length }, (_, idx) => {
      const elem = this.toArray()[idx];
      if (elem === 0 || elem === 1) {
        return elem === 1;
      }
      return 'NA';
    });
  }
}

export class RObjInt extends RObjAtomicVector {
  getNumber(idx: number): number {
    return this.get(idx).toArray()[0];
  }

  toNumber(): number {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getNumber(1);
  }

  toArray(): Int32Array {
    return Module.HEAP32.subarray(
      Module._INTEGER(this.ptr) / 4,
      Module._INTEGER(this.ptr) / 4 + this.length
    );
  }
}

export class RObjReal extends RObjAtomicVector {
  getNumber(idx: number): number {
    return this.get(idx).toArray()[0];
  }

  toNumber(): number {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getNumber(1);
  }

  toArray(): Float64Array {
    return Module.HEAPF64.subarray(
      Module._REAL(this.ptr) / 8,
      Module._REAL(this.ptr) / 8 + this.length
    );
  }
}

export class RObjComplex extends RObjAtomicVector {
  getComplex(idx: number): Complex {
    return this.get(idx).toJs()[0];
  }

  toComplex(): Complex {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getComplex(1);
  }

  toArray(): Float64Array {
    return Module.HEAPF64.subarray(
      Module._COMPLEX(this.ptr) / 8,
      Module._COMPLEX(this.ptr) / 8 + 2 * this.length
    );
  }

  toJs(): Complex[] {
    return Array.from({ length: this.length }, (_, idx) => {
      return {
        re: this.toArray()[2 * idx],
        im: this.toArray()[2 * idx + 1],
      };
    });
  }
}

export class RObjCharacter extends RObjAtomicVector {
  getString(idx: number): string {
    return this.get(idx).toJs()[0];
  }

  toString(): string {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getString(1);
  }

  toArray(): Uint32Array {
    return Module.HEAPU32.subarray(
      Module._STRING_PTR(this.ptr) / 4,
      Module._STRING_PTR(this.ptr) / 4 + this.length
    );
  }

  toJs(): string[] {
    return Array.from({ length: this.length }, (_, idx) =>
      new RObjString(Module._STRING_ELT(this.ptr, idx)).toJs()
    );
  }
}

export class RObjRawdata extends RObjAtomicVector {
  getNumber(idx: number): number {
    return this.get(idx).toArray()[0];
  }

  toNumber(): number {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getNumber(1);
  }

  toArray(): Uint8Array {
    return Module.HEAPU8.subarray(Module._RAW(this.ptr), Module._RAW(this.ptr) + this.length);
  }
}

export function isRObj(value: any): value is RObj {
  return value && typeof value === 'object' && 'type' in value && 'toJs' in value;
}
export function isRObjCallable(value: any): value is RObjFunction {
  return isRObj(value) && '_call' in value;
}

export function getRObjClass(type: RType): typeof RObj {
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
