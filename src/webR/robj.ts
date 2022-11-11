import type { Module } from './module';
import type { RProxy } from './proxy';

declare let Module: Module;

export interface ToTreeOptions {
  depth: number;
}

// RProxy<RObjImpl> type aliases
export type RObject = RProxy<RObjImpl>;
export type RNull = RProxy<RObjNull>;
export type RSymbol = RProxy<RObjSymbol>;
export type RPairlist = RProxy<RObjPairlist>;
export type REnvironment = RProxy<RObjEnvironment>;
export type RString = RProxy<RObjString>;
export type RLogical = RProxy<RObjLogical>;
export type RInteger = RProxy<RObjInteger>;
export type RDouble = RProxy<RObjDouble>;
export type RComplex = RProxy<RObjComplex>;
export type RCharacter = RProxy<RObjCharacter>;
export type RList = RProxy<RObjList>;
export type RRaw = RProxy<RObjRaw>;
// RFunction proxies are callable
export type RFunction = RProxy<RObjFunction> & ((...args: unknown[]) => Promise<unknown>);

export type RPtr = number;

export const RType = {
  null: 0,
  symbol: 1,
  pairlist: 2,
  closure: 3,
  environment: 4,
  promise: 5,
  call: 6,
  special: 7,
  builtin: 8,
  string: 9,
  logical: 10,
  integer: 13,
  double: 14,
  complex: 15,
  character: 16,
  dots: 17,
  any: 18,
  list: 19,
  expression: 20,
  bytecode: 21,
  pointer: 22,
  weakref: 23,
  raw: 24,
  s4: 25,
  new: 30,
  free: 31,
  function: 99,
} as const;
type RTypeKey = keyof typeof RType;
type RTypeNumber = typeof RType[keyof typeof RType];

export const RTargetType = {
  raw: 0,
  ptr: 1,
  err: 2,
} as const;

export type RTargetRaw = {
  obj: RawType;
  targetType: typeof RTargetType.raw;
};

export type RTargetPtr = {
  obj: {
    type?: RTypeKey;
    ptr: RPtr;
    methods?: string[];
  };
  targetType: typeof RTargetType.ptr;
};

export type RTargetError = {
  obj: {
    message: string;
    name: string;
    stack?: string;
  };
  targetType: typeof RTargetType.err;
};
export type RTargetObj = RTargetRaw | RTargetPtr | RTargetError;

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

export type NamedEntries<T> = [string | null, T][];
export type NamedObject<T> = { [key: string]: T };

export type RObjData = RObjImpl | RawType | RObjectTree<RObjImpl>;
export type RObjectTree<T> = RObjectTreeImpl<(RObjectTree<T> | RawType | T)[]>;
export type RObjectTreeAtomic<T> = RObjectTreeImpl<(T | null)[]>;
type RObjectTreeImpl<T> = {
  type: RTypeKey;
  names: (string | null)[] | null;
  values: T;
  missing?: boolean[];
};

function newRObjFromTarget(target: RTargetObj): RObjImpl {
  const obj = target.obj;
  if (target.targetType === RTargetType.ptr) {
    return RObjImpl.wrap(target.obj.ptr);
  }

  if (typeof obj === 'number') {
    const ptr = Module._Rf_ScalarReal(obj);
    return new RObjDouble(ptr);
  }

  if (typeof obj === 'string') {
    const str = Module.allocateUTF8(obj);
    const ptr = Module._Rf_mkString(str);
    Module._free(str);
    return new RObjCharacter(ptr);
  }

  if (typeof obj === 'boolean') {
    const ptr = Module._Rf_ScalarLogical(obj);
    return new RObjLogical(ptr);
  }

  if (typeof obj === 'object' && obj && 're' in obj && 'im' in obj) {
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RType.complex, 1));
    Module.setValue(Module._COMPLEX(ptr), obj.re, 'double');
    Module.setValue(Module._COMPLEX(ptr) + 8, obj.im, 'double');
    Module._Rf_unprotect(1);
    return new RObjComplex(ptr);
  }

  if (Array.isArray(obj) && obj.some((el) => typeof el === 'string')) {
    // Create a vector of strings
    const robjVec = Module._Rf_protect(Module._Rf_allocVector(RType.character, obj.length));
    obj.forEach((el, idx) => {
      const str = Module.allocateUTF8(String(el));
      Module._SET_STRING_ELT(robjVec, idx, Module._Rf_mkChar(str));
      Module._free(str);
    });
    Module._Rf_unprotect(1);
    return RObjImpl.wrap(robjVec);
  }

  if (Array.isArray(obj) && obj.some((el) => typeof el === 'number')) {
    // Create a vector of reals
    const robjVec = Module._Rf_protect(Module._Rf_allocVector(RType.double, obj.length));
    obj.forEach((el, idx) =>
      Module.setValue(Module._REAL(robjVec) + 8 * idx, Number(el), 'double')
    );
    Module._Rf_unprotect(1);
    return RObjImpl.wrap(robjVec);
  }

  if (Array.isArray(obj)) {
    // Create a vector of logicals
    const robjVec = Module._Rf_protect(Module._Rf_allocVector(RType.logical, obj.length));
    obj.forEach((el, idx) => Module.setValue(Module._LOGICAL(robjVec) + 4 * idx, el, 'i32'));
    Module._Rf_unprotect(1);
    return RObjImpl.wrap(robjVec);
  }

  throw new Error('Robj construction for this JS object is not yet supported');
}

export class RObjImpl {
  ptr: RPtr;

  constructor(target: RPtr | RTargetObj) {
    this.ptr = 0;
    if (typeof target === 'number') {
      // We have a number, assume it is an RPtr to an R object
      this.ptr = target;
      return this;
    }
    const obj = newRObjFromTarget(target);
    obj.preserve();
    return obj;
  }

  get [Symbol.toStringTag](): string {
    return `RObj:${this.type()}`;
  }

  type(): RTypeKey {
    const typeNumber = Module._TYPEOF(this.ptr) as RTypeNumber;
    const type = Object.keys(RType).find((typeName) => RType[typeName as RTypeKey] === typeNumber);
    return type as RTypeKey;
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
    return Module._TYPEOF(this.ptr) === RType.null;
  }

  isUnbound(): boolean {
    return this.ptr === RObjImpl.unboundValue.ptr;
  }

  attrs(): Nullable<RObjPairlist> {
    return RObjImpl.wrap(Module._ATTRIB(this.ptr)) as RObjPairlist;
  }

  names(): (string | null)[] | null {
    const attrs = this.attrs();
    if (attrs.isNull()) {
      return null;
    }
    const names = attrs.get('names') as Nullable<RObjCharacter>;
    if (names.isNull()) {
      return null;
    }
    return names.toArray();
  }

  includes(name: string) {
    const names = this.names();
    return names && names.includes(name);
  }

  toTree(options: ToTreeOptions = { depth: 0 }, depth = 1): RawType | RObjectTree<RObjImpl> {
    throw new Error('This R object cannot be converted to JS');
  }

  toJs() {
    return this.toTree() as ReturnType<this['toTree']>;
  }

  subset(prop: number | string): RObjImpl {
    let idx: RPtr;
    let char: RPtr = 0;
    if (typeof prop === 'number') {
      idx = Module._Rf_protect(Module._Rf_ScalarInteger(prop));
    } else {
      char = Module.allocateUTF8(prop);
      idx = Module._Rf_protect(Module._Rf_mkString(char));
    }
    const call = Module._Rf_protect(Module._Rf_lang3(RObjImpl.bracketSymbol.ptr, this.ptr, idx));
    const sub = RObjImpl.wrap(Module._Rf_eval(call, RObjImpl.baseEnv.ptr));
    Module._Rf_unprotect(2);
    if (char) Module._free(char);
    return sub;
  }

  get(prop: number | string): RObjImpl {
    let idx: RPtr;
    let char: RPtr = 0;
    if (typeof prop === 'number') {
      idx = Module._Rf_protect(Module._Rf_ScalarInteger(prop));
    } else {
      char = Module.allocateUTF8(prop);
      idx = Module._Rf_protect(Module._Rf_mkString(char));
    }
    const call = Module._Rf_protect(Module._Rf_lang3(RObjImpl.bracket2Symbol.ptr, this.ptr, idx));
    const sub = RObjImpl.wrap(Module._Rf_eval(call, RObjImpl.baseEnv.ptr));
    Module._Rf_unprotect(2);
    if (char) Module._free(char);
    return sub;
  }

  getDollar(prop: string): RObjImpl {
    const char = Module.allocateUTF8(prop);
    const idx = Module._Rf_protect(Module._Rf_mkString(char));
    const call = Module._Rf_protect(Module._Rf_lang3(RObjImpl.dollarSymbol.ptr, this.ptr, idx));
    const sub = RObjImpl.wrap(Module._Rf_eval(call, RObjImpl.baseEnv.ptr));
    Module._Rf_unprotect(2);
    Module._free(char);
    return sub;
  }

  pluck(...path: (string | number)[]): RObjImpl | undefined {
    try {
      const result = path.reduce(
        (obj: RObjImpl, prop: string | number): RObjImpl => obj.get(prop),
        this
      );
      return result.isNull() ? undefined : result;
    } catch (err) {
      // Deal with subscript out of bounds error
      if (err === Infinity) {
        return undefined;
      }
      throw err;
    }
  }

  set(prop: string | number, value: RObjImpl | RawType) {
    let idx: RPtr;
    let char: RPtr = 0;
    if (typeof prop === 'number') {
      idx = Module._Rf_protect(Module._Rf_ScalarInteger(prop));
    } else {
      char = Module.allocateUTF8(prop);
      idx = Module._Rf_protect(Module._Rf_mkString(char));
    }

    const valueObj = isRObjImpl(value)
      ? value
      : new RObjImpl({ obj: value, targetType: RTargetType.raw });

    const assign = Module.allocateUTF8('[[<-');
    const call = Module._Rf_protect(
      Module._Rf_lang4(Module._Rf_install(assign), this.ptr, idx, valueObj.ptr)
    );
    const val = RObjImpl.wrap(Module._Rf_eval(call, RObjImpl.baseEnv.ptr));

    Module._Rf_unprotect(2);
    if (char) Module._free(char);
    Module._free(assign);

    if (!isRObjImpl(value)) {
      valueObj.release();
    }

    return val;
  }

  static getMethods(obj: RObjImpl) {
    const props = new Set<string>();
    let cur: unknown = obj;
    do {
      Object.getOwnPropertyNames(cur).map((p) => props.add(p));
    } while ((cur = Object.getPrototypeOf(cur)));
    return [...props.keys()].filter((i) => typeof obj[i as keyof typeof obj] === 'function');
  }

  static get globalEnv(): RObjImpl {
    return RObjImpl.wrap(Module.getValue(Module._R_GlobalEnv, '*'));
  }

  static get emptyEnv(): RObjImpl {
    return RObjImpl.wrap(Module.getValue(Module._R_EmptyEnv, '*'));
  }

  static get baseEnv(): RObjImpl {
    return RObjImpl.wrap(Module.getValue(Module._R_BaseEnv, '*'));
  }

  static get null(): RObjNull {
    return new RObjNull(Module.getValue(Module._R_NilValue, '*'));
  }

  static get unboundValue(): RObjImpl {
    return RObjImpl.wrap(Module.getValue(Module._R_UnboundValue, '*'));
  }

  static get bracketSymbol(): RObjSymbol {
    return new RObjSymbol(Module.getValue(Module._R_BracketSymbol, '*'));
  }

  static get bracket2Symbol(): RObjSymbol {
    return new RObjSymbol(Module.getValue(Module._R_Bracket2Symbol, '*'));
  }

  static get dollarSymbol(): RObjSymbol {
    return new RObjSymbol(Module.getValue(Module._R_DollarSymbol, '*'));
  }

  static wrap(ptr: RPtr): RObjImpl {
    const typeNumber = Module._TYPEOF(ptr) as RTypeNumber;
    return new (getRObjClass(typeNumber))(ptr);
  }

  static protect<T extends RObjImpl>(obj: T): T {
    return RObjImpl.wrap(Module._Rf_protect(obj.ptr)) as T;
  }

  static unprotect(n: number): void {
    Module._Rf_unprotect(n);
  }

  static unprotectPtr(obj: RObjImpl): void {
    Module._Rf_unprotect_ptr(obj.ptr);
  }

  static preserveObject(obj: RObjImpl): void {
    Module._R_PreserveObject(obj.ptr);
  }

  static releaseObject(obj: RObjImpl): void {
    Module._R_ReleaseObject(obj.ptr);
  }
}

export class RObjNull extends RObjImpl {
  toTree(): null {
    return null;
  }
}

export class RObjSymbol extends RObjImpl {
  toTree(): RawType {
    return this.isUnbound() ? null : this.toObject();
  }

  toObject(): {
    printname: string | null;
    symvalue: RPtr | null;
    internal: RPtr | null;
  } {
    return {
      printname: this.printname().isUnbound() ? null : this.printname().toString(),
      symvalue: this.symvalue().isUnbound() ? null : this.symvalue().ptr,
      internal: this.internal().isNull() ? null : this.internal().ptr,
    };
  }

  printname(): RObjString {
    return new RObjString(Module._PRINTNAME(this.ptr));
  }
  symvalue(): RObjImpl {
    return RObjImpl.wrap(Module._SYMVALUE(this.ptr));
  }
  internal(): RObjImpl {
    return RObjImpl.wrap(Module._INTERNAL(this.ptr));
  }
}

export class RObjPairlist extends RObjImpl {
  get length(): number {
    return this.toArray().length;
  }

  toArray(options: ToTreeOptions = { depth: 1 }): RObjData[] {
    return this.toTree(options).values;
  }

  toObject({
    allowDuplicateKey = true,
    allowEmptyKey = false,
    depth = 1,
  } = {}): NamedObject<RObjData> {
    const entries = this.entries({ depth });
    const keys = entries.map(([k, v]) => k);
    if (!allowDuplicateKey && new Set(keys).size !== keys.length) {
      throw new Error('Duplicate key when converting pairlist without allowDuplicateKey enabled');
    }
    if (!allowEmptyKey && keys.some((k) => !k)) {
      throw new Error('Empty or null key when converting pairlist without allowEmptyKey enabled');
    }
    return Object.fromEntries(
      entries.filter((u, idx) => entries.findIndex((v) => v[0] === u[0]) === idx)
    );
  }

  entries(options: ToTreeOptions = { depth: 1 }): NamedEntries<RObjData> {
    const obj = this.toTree(options);
    return obj.values.map((v, i) => [obj.names ? obj.names[i] : null, v]);
  }

  toTree(options: ToTreeOptions = { depth: 0 }, depth = 1): RObjectTree<RObjImpl> {
    const namesArray: string[] = [];
    let hasNames = false;
    const values: (RawType | RObjImpl | RObjectTree<RObjImpl>)[] = [];

    for (let next = this as Nullable<RObjPairlist>; !next.isNull(); next = next.cdr()) {
      const symbol = next.tag();
      if (symbol.isNull()) {
        namesArray.push('');
      } else {
        hasNames = true;
        namesArray.push(symbol.printname().toString());
      }
      if (options.depth && depth >= options.depth) {
        values.push(next.car());
      } else {
        values.push(next.car().toTree(options, depth + 1));
      }
    }
    const names = hasNames ? namesArray : null;
    return { type: this.type(), names, values };
  }

  includes(name: string): boolean {
    return name in this.toObject();
  }

  setcar(obj: RObjImpl): void {
    Module._SETCAR(this.ptr, obj.ptr);
  }

  car(): RObjImpl {
    return RObjImpl.wrap(Module._CAR(this.ptr));
  }

  cdr(): Nullable<RObjPairlist> {
    return RObjImpl.wrap(Module._CDR(this.ptr)) as Nullable<RObjPairlist>;
  }

  tag(): Nullable<RObjSymbol> {
    return RObjImpl.wrap(Module._TAG(this.ptr)) as Nullable<RObjSymbol>;
  }
}

export class RObjList extends RObjImpl {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }

  toArray(options: { depth: number } = { depth: 1 }): RObjData[] {
    return this.toTree(options).values;
  }

  toObject({
    allowDuplicateKey = true,
    allowEmptyKey = false,
    depth = 1,
  } = {}): NamedObject<RObjData> {
    const entries = this.entries({ depth });
    const keys = entries.map(([k, v]) => k);
    if (!allowDuplicateKey && new Set(keys).size !== keys.length) {
      throw new Error('Duplicate key when converting list without allowDuplicateKey enabled');
    }
    if (!allowEmptyKey && keys.some((k) => !k)) {
      throw new Error('Empty or null key when converting list without allowEmptyKey enabled');
    }
    return Object.fromEntries(
      entries.filter((u, idx) => entries.findIndex((v) => v[0] === u[0]) === idx)
    );
  }

  entries(options: { depth: number } = { depth: 1 }): NamedEntries<RObjData> {
    const obj = this.toTree(options);
    return obj.values.map((v, i) => [obj.names ? obj.names[i] : null, v]);
  }

  toTree(options: { depth: number } = { depth: 0 }, depth = 1): RObjectTree<RObjImpl> {
    return {
      type: this.type(),
      names: this.names(),
      values: [...Array(this.length).keys()].map((i) => {
        if (options.depth && depth >= options.depth) {
          return this.get(i + 1);
        } else {
          return this.get(i + 1).toTree(options, depth + 1);
        }
      }),
    };
  }
}

export class RObjFunction extends RObjImpl {
  exec(...args: (RawType | RObjImpl)[]): RObjImpl {
    const argObjs = args.map((arg) =>
      isRObjImpl(arg) ? arg : new RObjImpl({ obj: arg, targetType: RTargetType.raw })
    );
    const call = RObjImpl.protect(
      new RObjPairlist(Module._Rf_allocVector(RType.call, args.length + 1))
    );
    call.setcar(this);
    let c = call.cdr();
    let i = 0;
    while (!c.isNull()) {
      c.setcar(argObjs[i++]);
      c = c.cdr();
    }
    const res = RObjImpl.wrap(Module._Rf_eval(call.ptr, RObjImpl.baseEnv.ptr));
    RObjImpl.unprotect(1);

    argObjs.forEach((argObj, idx) => {
      if (!isRObjImpl(args[idx])) {
        argObj.release();
      }
    });

    return res;
  }
}

export class RObjString extends RObjImpl {
  toString(): string {
    return Module.UTF8ToString(Module._R_CHAR(this.ptr));
  }

  toTree(): string {
    return this.toString();
  }
}

export class RObjEnvironment extends RObjImpl {
  ls(all = false, sorted = true): string[] {
    return new RObjCharacter(Module._R_lsInternal3(this.ptr, all, sorted)).toArray() as string[];
  }

  names(): string[] {
    return this.ls(true, true);
  }

  frame(): RObjImpl {
    return RObjImpl.wrap(Module._FRAME(this.ptr));
  }

  subset(prop: number | string): RObjImpl {
    if (typeof prop === 'number') {
      throw new Error('Object of type environment is not subsettable');
    }
    return this.getDollar(prop);
  }

  toObject({ depth = 0 } = {}): NamedObject<RawType | RObjImpl | RObjectTree<RObjImpl>> {
    const symbols = this.names();
    return Object.fromEntries(
      [...Array(symbols.length).keys()].map((i) => {
        return [symbols[i], this.getDollar(symbols[i]).toTree({ depth })];
      })
    );
  }

  toTree(options: { depth: number } = { depth: 0 }, depth = 1): RObjectTree<RObjImpl> {
    const names = this.names();
    const values = [...Array(names.length).keys()].map((i) => {
      if (options.depth && depth >= options.depth) {
        return this.getDollar(names[i]);
      } else {
        return this.getDollar(names[i]).toTree(options, depth + 1);
      }
    });

    return {
      type: this.type(),
      names,
      values,
    };
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
  | Float64Array;

type atomicType = number | boolean | Complex | string;

abstract class RObjAtomicVector<T extends atomicType> extends RObjImpl {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }

  get(prop: number | string): this {
    return super.get(prop) as this;
  }

  subset(prop: number | string): this {
    return super.subset(prop) as this;
  }

  getDollar(prop: string): RObjImpl {
    throw new Error('$ operator is invalid for atomic vectors');
  }

  detectMissing(): boolean[] {
    const isna = Module.allocateUTF8('is.na');
    const call = Module._Rf_protect(Module._Rf_lang2(Module._Rf_install(isna), this.ptr));
    const val = RObjImpl.wrap(
      Module._Rf_protect(Module._Rf_eval(call, RObjImpl.baseEnv.ptr))
    ) as RObjLogical;
    const ret = val.toTypedArray();
    RObjImpl.unprotect(2);
    Module._free(isna);
    return Array.from(ret).map((elt) => Boolean(elt));
  }

  abstract toTypedArray(): TypedArray;

  toArray(): (T | null)[] {
    const arr = this.toTypedArray();
    return this.detectMissing().map((m, idx) => (m ? null : (arr[idx] as T)));
  }

  toObject({ allowDuplicateKey = true, allowEmptyKey = false } = {}): NamedObject<T | null> {
    const entries = this.entries();
    const keys = entries.map(([k, v]) => k);
    if (!allowDuplicateKey && new Set(keys).size !== keys.length) {
      throw new Error(
        'Duplicate key when converting atomic vector without allowDuplicateKey enabled'
      );
    }
    if (!allowEmptyKey && keys.some((k) => !k)) {
      throw new Error(
        'Empty or null key when converting atomic vector without allowEmptyKey enabled'
      );
    }
    return Object.fromEntries(
      entries.filter((u, idx) => entries.findIndex((v) => v[0] === u[0]) === idx)
    );
  }

  entries(): NamedEntries<T | null> {
    const values = this.toArray();
    const names = this.names();
    return values.map((v, i) => [names ? names[i] : null, v]);
  }

  toTree(): RObjectTreeAtomic<T> {
    return {
      type: this.type(),
      names: this.names(),
      values: this.toArray(),
      missing: this.detectMissing(),
    };
  }
}

export class RObjLogical extends RObjAtomicVector<boolean> {
  getLogical(idx: number): boolean | null {
    return this.get(idx).toArray()[0];
  }

  toLogical(): boolean | null {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getLogical(1);
  }

  toTypedArray(): Int32Array {
    return new Int32Array(
      Module.HEAP32.subarray(
        Module._LOGICAL(this.ptr) / 4,
        Module._LOGICAL(this.ptr) / 4 + this.length
      )
    );
  }

  toArray(): (boolean | null)[] {
    const arr = this.toTypedArray();
    return this.detectMissing().map((m, idx) => (m ? null : Boolean(arr[idx])));
  }
}

export class RObjInteger extends RObjAtomicVector<number> {
  getNumber(idx: number): number | null {
    return this.get(idx).toArray()[0];
  }

  toNumber(): number | null {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getNumber(1);
  }

  toTypedArray(): Int32Array {
    return new Int32Array(
      Module.HEAP32.subarray(
        Module._INTEGER(this.ptr) / 4,
        Module._INTEGER(this.ptr) / 4 + this.length
      )
    );
  }
}

export class RObjDouble extends RObjAtomicVector<number> {
  getNumber(idx: number): number | null {
    return this.get(idx).toTypedArray()[0];
  }

  toNumber(): number | null {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getNumber(1);
  }

  toTypedArray(): Float64Array {
    return new Float64Array(
      Module.HEAPF64.subarray(Module._REAL(this.ptr) / 8, Module._REAL(this.ptr) / 8 + this.length)
    );
  }
}

export class RObjComplex extends RObjAtomicVector<Complex> {
  getComplex(idx: number): Complex | null {
    return this.get(idx).toArray()[0];
  }

  toComplex(): Complex | null {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getComplex(1);
  }

  toTypedArray(): Float64Array {
    return new Float64Array(
      Module.HEAPF64.subarray(
        Module._COMPLEX(this.ptr) / 8,
        Module._COMPLEX(this.ptr) / 8 + 2 * this.length
      )
    );
  }

  toArray(): (Complex | null)[] {
    const arr = this.toTypedArray();
    return this.detectMissing().map((m, idx) =>
      m ? null : { re: arr[2 * idx], im: arr[2 * idx + 1] }
    );
  }
}

export class RObjCharacter extends RObjAtomicVector<string> {
  getString(idx: number): string | null {
    return this.get(idx).toArray()[0];
  }

  toString(): string | null {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getString(1);
  }

  toTypedArray(): Uint32Array {
    return new Uint32Array(
      Module.HEAPU32.subarray(
        Module._STRING_PTR(this.ptr) / 4,
        Module._STRING_PTR(this.ptr) / 4 + this.length
      )
    );
  }

  toArray(): (string | null)[] {
    return this.detectMissing().map((m, idx) =>
      m ? null : Module.UTF8ToString(Module._R_CHAR(Module._STRING_ELT(this.ptr, idx)))
    );
  }
}

export class RObjRaw extends RObjAtomicVector<number> {
  getNumber(idx: number): number | null {
    return this.get(idx).toArray()[0];
  }

  toNumber(): number | null {
    if (this.length !== 1) {
      throw new Error('Unable to convert atomic vector of length > 1 to a scalar JS value');
    }
    return this.getNumber(1);
  }

  toTypedArray(): Uint8Array {
    return new Uint8Array(
      Module.HEAPU8.subarray(Module._RAW(this.ptr), Module._RAW(this.ptr) + this.length)
    );
  }
}

/**
 * Test for an RObjImpl instance
 *
 * RObjImpl is the internal interface to R objects, intended to be used
 * on the worker thread.
 *
 * @private
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RObjImpl.
 */
export function isRObjImpl(value: any): value is RObjImpl {
  return value && typeof value === 'object' && 'type' in value && 'toJs' in value;
}

/**
 * Test for an RObject instance
 *
 * RObject is the user facing interface to R objects.
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RObject.
 */
export function isRObject(value: any): value is RObject {
  return (
    value &&
    (typeof value === 'object' || typeof value === 'function') &&
    'targetType' in value &&
    isRTargetPtr(value._target)
  );
}

/**
 * Test for an RTargetObj object
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RTargetObj.
 */
export function isRTargetObj(value: any): value is RTargetObj {
  return (
    value &&
    typeof value === 'object' &&
    'targetType' in value &&
    'obj' in value &&
    value.targetType in Object.values(RTargetType)
  );
}

/**
 * Test for an RTargetPtr instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RTargetPtr.
 */
export function isRTargetPtr(value: any): value is RTargetPtr {
  return isRTargetObj(value) && value.targetType === RTargetType.ptr;
}

/**
 * Test for an RFunction instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RFunction.
 */
export function isRFunction(value: any): value is RFunction {
  return Boolean(isRObject(value) && value._target.obj.methods?.includes('exec'));
}

/**
 * Test for an RObjectTree instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RObjectTree.
 */
export function isRObjectTree(value: any): value is RObjectTree<any> {
  return (
    typeof value === 'object' &&
    (Array.isArray(value.names) || value.names === null) &&
    Object.keys(RType).includes(value.type as string)
  );
}

export function getRObjClass(type: typeof RType[keyof typeof RType]): typeof RObjImpl {
  const typeClasses: { [key: number]: typeof RObjImpl } = {
    [RType.null]: RObjNull,
    [RType.symbol]: RObjSymbol,
    [RType.pairlist]: RObjPairlist,
    [RType.closure]: RObjFunction,
    [RType.environment]: RObjEnvironment,
    [RType.call]: RObjPairlist,
    [RType.special]: RObjFunction,
    [RType.builtin]: RObjFunction,
    [RType.string]: RObjString,
    [RType.logical]: RObjLogical,
    [RType.integer]: RObjInteger,
    [RType.double]: RObjDouble,
    [RType.complex]: RObjComplex,
    [RType.character]: RObjCharacter,
    [RType.list]: RObjList,
    [RType.raw]: RObjRaw,
    [RType.function]: RObjFunction,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  return RObjImpl;
}
