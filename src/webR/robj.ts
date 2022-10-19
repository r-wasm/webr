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
  RAW = 'RAW',
  PTR = 'PTR',
  ERR = 'ERR',
}

export type RTargetPtr = {
  obj: RPtr;
  methods: string[];
  type: RTargetType.PTR;
};
export type RTargetRaw = {
  obj: RawType;
  type: RTargetType.RAW;
};
export type RTargetError = {
  obj: {
    message: string;
    name: string;
    stack?: string;
  };
  type: RTargetType.ERR;
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

export type RObjectTree<T> = RObjectTreeImpl<(RObjectTree<T> | RawType | T)[]>;
export type RObjectTreeAtomic<T> = RObjectTreeImpl<(T | null)[]>;
type RObjectTreeImpl<T> = {
  type: string;
  names: (string | null)[] | null;
  values: T;
  missing?: boolean[];
};

function newRObjFromTarget(target: RTargetObj): RObjImpl {
  const obj = target.obj;
  if (obj === null) {
    return new RObjNull();
  }

  if (isRObjectTree(obj)) {
    const typeNumber: RType = (RType as any)[obj.type] as RType;
    return new (getRObjClass(typeNumber))(obj);
  }

  const values = Array.isArray(obj) ? obj : [obj];
  if (values.every((el) => typeof el === 'boolean' || el === null)) {
    return new RObjLogical(obj as atomicTarget<boolean>);
  }
  if (values.every((el) => typeof el === 'number' || el === null)) {
    return new RObjDouble(obj as atomicTarget<number>);
  }
  if (values.every((el) => el === null || (typeof el === 'object' && 're' in el && 'im' in el))) {
    return new RObjComplex(obj as atomicTarget<Complex>);
  }
  if (values.every((el) => typeof el === 'string' || el === null)) {
    return new RObjCharacter(obj as atomicTarget<string>);
  }

  if (Array.isArray(obj)) {
    return new RObjList(obj as RawType[]);
  }

  throw new Error('Robj construction for this JS object is not yet supported');
}

export class RObjImpl {
  ptr: RPtr;

  constructor(target: RTargetObj | RawType) {
    this.ptr = 0;
    if (isRTargetObj(target)) {
      if (target.type === RTargetType.PTR) {
        this.ptr = target.obj;
        return this;
      }
      if (target.type === RTargetType.RAW) {
        return newRObjFromTarget(target);
      }
    }
    return newRObjFromTarget({ type: RTargetType.RAW, obj: target });
  }

  get [Symbol.toStringTag](): string {
    return `RObj:${RType[this.type()]}`;
  }

  type(): RType {
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
    return this.ptr === RObjImpl.unboundValue.ptr;
  }

  attrs(): Nullable<RObjPairlist> {
    return RObjImpl.wrap(Module._ATTRIB(this.ptr)) as RObjPairlist;
  }

  names(values?: (string | null)[] | null): (string | null)[] | null {
    if (values) {
      const namesChr = new RObjCharacter(values);
      RObjImpl.protect(namesChr);
      Module._Rf_setAttrib(this.ptr, RObjImpl.namesSymbol.ptr, namesChr.ptr);
      RObjImpl.unprotect(1);
    }
    const attrs = this.attrs();
    if (attrs.isNull()) {
      return null;
    }
    const names = RObjImpl.wrap(
      Module._Rf_protect(Module._Rf_getAttrib(this.ptr, RObjImpl.namesSymbol.ptr))
    ) as RObjCharacter;
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
      : new RObjImpl({ obj: value, type: RTargetType.RAW });

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
    return new RObjNull();
  }

  static get naInt(): number {
    return Module.getValue(Module._R_NaInt, 'i32');
  }

  static get naReal(): number {
    return Module.getValue(Module._R_NaReal, 'double');
  }

  static get naString(): RObjImpl {
    return RObjImpl.wrap(Module.getValue(Module._R_NaString, '*'));
  }

  static get unboundValue(): RObjImpl {
    return RObjImpl.wrap(Module.getValue(Module._R_UnboundValue, '*'));
  }

  static get bracketSymbol(): RObjSymbol {
    return RObjImpl.wrap(Module.getValue(Module._R_BracketSymbol, '*')) as RObjSymbol;
  }

  static get bracket2Symbol(): RObjSymbol {
    return RObjImpl.wrap(Module.getValue(Module._R_Bracket2Symbol, '*')) as RObjSymbol;
  }

  static get dollarSymbol(): RObjSymbol {
    return RObjImpl.wrap(Module.getValue(Module._R_DollarSymbol, '*')) as RObjSymbol;
  }

  static get namesSymbol(): RObjSymbol {
    return RObjImpl.wrap(Module.getValue(Module._R_NamesSymbol, '*')) as RObjSymbol;
  }

  static wrap(ptr: RPtr): RObjImpl {
    const type = Module._TYPEOF(ptr);
    return new (getRObjClass(type))({ type: RTargetType.PTR, obj: ptr });
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
  constructor() {
    super({ type: RTargetType.PTR, obj: Module.getValue(Module._R_NilValue, '*') });
  }

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
    return RObjImpl.wrap(Module._PRINTNAME(this.ptr)) as RObjString;
  }
  symvalue(): RObjImpl {
    return RObjImpl.wrap(Module._SYMVALUE(this.ptr));
  }
  internal(): RObjImpl {
    return RObjImpl.wrap(Module._INTERNAL(this.ptr));
  }
}

export class RObjPairlist extends RObjImpl {
  constructor(val: RawType | (RawType | null)[] | RTargetPtr | RObjectTree<RTargetObj>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const list = RObjImpl.wrap(Module._Rf_allocList(values.length)) as RObjPairlist;
    list.preserve();
    for (
      let [i, next] = [0, list as Nullable<RObjPairlist>];
      !next.isNull();
      [i, next] = [i + 1, next.cdr()]
    ) {
      next.setcar(new RObjImpl(values[i]));
    }
    list.names(isRObjectTree(val) ? val.names : null);
    super({ type: RTargetType.PTR, obj: list.ptr });
  }

  get length(): number {
    return this.toArray().length;
  }

  toArray(options: ToTreeOptions = { depth: 1 }): (RObjImpl | RawType | RObjectTree<RObjImpl>)[] {
    return this.toTree(options).values;
  }

  toObject({ allowDuplicateKey = true, allowEmptyKey = false, depth = 1 } = {}): NamedObject<
    RObjImpl | RawType | RObjectTree<RObjImpl>
  > {
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

  entries(
    options: ToTreeOptions = { depth: 1 }
  ): NamedEntries<RObjImpl | RawType | RObjectTree<RObjImpl>> {
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
    return { type: RType[this.type()], names, values };
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
  constructor(val: RawType | (RawType | null)[] | RTargetPtr | RObjectTree<RTargetObj>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RType.List, values.length));
    values.forEach((v, i) => {
      Module._SET_VECTOR_ELT(ptr, i, new RObjImpl(v).ptr);
    });
    RObjImpl.wrap(ptr).names(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ type: RTargetType.PTR, obj: ptr });
  }

  get length(): number {
    return Module._LENGTH(this.ptr);
  }

  toArray(
    options: { depth: number } = { depth: 1 }
  ): (RObjImpl | RawType | RObjectTree<RObjImpl>)[] {
    return this.toTree(options).values;
  }

  toObject({ allowDuplicateKey = true, allowEmptyKey = false, depth = 1 } = {}): NamedObject<
    RObjImpl | RawType | RObjectTree<RObjImpl>
  > {
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

  entries(
    options: { depth: number } = { depth: 1 }
  ): NamedEntries<RObjImpl | RawType | RObjectTree<RObjImpl>> {
    const obj = this.toTree(options);
    return obj.values.map((v, i) => [obj.names ? obj.names[i] : null, v]);
  }

  toTree(options: { depth: number } = { depth: 0 }, depth = 1): RObjectTree<RObjImpl> {
    return {
      type: RType[this.type()],
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
      isRObjImpl(arg) ? arg : new RObjImpl({ obj: arg, type: RTargetType.RAW })
    );
    const call = RObjImpl.protect(
      RObjImpl.wrap(Module._Rf_allocVector(RType.Call, args.length + 1)) as RObjPairlist
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
    const ls = RObjImpl.wrap(Module._R_lsInternal3(this.ptr, all, sorted)) as RObjCharacter;
    return ls.toArray() as string[];
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
      type: RType[this.type()],
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
type atomicTarget<T extends atomicType> = T | (T | null)[] | RObjectTreeAtomic<T> | RTargetPtr;

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
      type: RType[this.type()],
      names: this.names(),
      values: this.toArray(),
      missing: this.detectMissing(),
    };
  }
}

export class RObjLogical extends RObjAtomicVector<boolean> {
  constructor(val: atomicTarget<boolean>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RType.Logical, values.length));
    values.forEach((v, i) =>
      Module.setValue(Module._LOGICAL(ptr) + 4 * i, v === null ? RObjImpl.naInt : Boolean(v), 'i32')
    );
    RObjImpl.wrap(ptr).names(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ type: RTargetType.PTR, obj: ptr });
  }

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
  constructor(val: atomicTarget<number>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RType.Integer, values.length));
    values.forEach((v, i) =>
      Module.setValue(
        Module._INTEGER(ptr) + 4 * i,
        v === null ? RObjImpl.naInt : Math.round(Number(v)),
        'i32'
      )
    );
    RObjImpl.wrap(ptr).names(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ type: RTargetType.PTR, obj: ptr });
  }

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
  constructor(val: atomicTarget<number>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RType.Double, values.length));
    values.forEach((v, i) =>
      Module.setValue(Module._REAL(ptr) + 8 * i, v === null ? RObjImpl.naReal : v, 'double')
    );
    RObjImpl.wrap(ptr).names(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ type: RTargetType.PTR, obj: ptr });
  }

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
  constructor(val: atomicTarget<Complex>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RType.Complex, values.length));
    values.forEach((v, i) =>
      Module.setValue(
        Module._COMPLEX(ptr) + 8 * (2 * i),
        v === null ? RObjImpl.naReal : v.re,
        'double'
      )
    );
    values.forEach((v, i) =>
      Module.setValue(
        Module._COMPLEX(ptr) + 8 * (2 * i + 1),
        v === null ? RObjImpl.naReal : v.im,
        'double'
      )
    );
    RObjImpl.wrap(ptr).names(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ type: RTargetType.PTR, obj: ptr });
  }

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
  constructor(val: atomicTarget<string>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RType.Character, values.length));
    values.forEach((v, i) => {
      if (v === null) {
        Module._SET_STRING_ELT(ptr, i, RObjImpl.naString.ptr);
      } else {
        const str = Module.allocateUTF8(String(v));
        Module._SET_STRING_ELT(ptr, i, Module._Rf_mkChar(str));
        Module._free(str);
      }
    });
    RObjImpl.wrap(ptr).names(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ type: RTargetType.PTR, obj: ptr });
  }

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
  constructor(val: atomicTarget<number>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    if (values.some((v) => v === null || v > 255 || v < 0)) {
      throw new Error('Cannot create new RRaw object');
    }
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RType.Raw, values.length));
    values.forEach((v, i) => Module.setValue(Module._RAW(ptr) + i, Number(v), 'i8'));
    RObjImpl.wrap(ptr).names(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ type: RTargetType.PTR, obj: ptr });
  }

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
    (typeof value === 'object' || typeof value === 'function') &&
    'type' in value &&
    'obj' in value &&
    'methods' in value &&
    value._target.type === 'PTR'
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
    'type' in value &&
    'obj' in value &&
    value.type in RTargetType
  );
}

/**
 * Test for an RTargetPtr instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RTargetPtr.
 */
export function isRTargetPtr(value: any): value is RTargetPtr {
  return isRTargetObj(value) && value.type === 'PTR';
}

/**
 * Test for an RFunction instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RFunction.
 */
export function isRFunction(value: any): value is RFunction {
  return isRObject(value) && 'methods' in value._target && value._target.methods.includes('exec');
}

/**
 * Test for an RObjectTree instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RObjectTree.
 */
export function isRObjectTree(value: any): value is RObjectTree<any> {
  return (
    value &&
    typeof value === 'object' &&
    'type' in value &&
    'names' in value &&
    'values' in value &&
    (Array.isArray(value.names) || value.names === null) &&
    typeof value.type === 'string' &&
    Object.values(RType).includes(value.type as string)
  );
}

export function getRObjClass(type: RType): typeof RObjImpl {
  const typeClasses: { [key: number]: typeof RObjImpl } = {
    [RType.Null]: RObjNull,
    [RType.Symbol]: RObjSymbol,
    [RType.Pairlist]: RObjPairlist,
    [RType.Closure]: RObjFunction,
    [RType.Environment]: RObjEnvironment,
    [RType.Call]: RObjPairlist,
    [RType.Special]: RObjFunction,
    [RType.Builtin]: RObjFunction,
    [RType.String]: RObjString,
    [RType.Logical]: RObjLogical,
    [RType.Integer]: RObjInteger,
    [RType.Double]: RObjDouble,
    [RType.Complex]: RObjComplex,
    [RType.Character]: RObjCharacter,
    [RType.List]: RObjList,
    [RType.Raw]: RObjRaw,
    [RType.Function]: RObjFunction,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  return RObjImpl;
}
