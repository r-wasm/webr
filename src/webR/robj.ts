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

export const RTypeMap = {
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
export type RType = keyof typeof RTypeMap;
export type RTypeNumber = typeof RTypeMap[keyof typeof RTypeMap];

export type RTargetRaw = {
  obj: RawType;
  targetType: 'raw';
};

export type RTargetPtr = {
  obj: {
    type?: RType;
    ptr: RPtr;
    methods?: string[];
  };
  targetType: 'ptr';
};

export type RTargetError = {
  obj: {
    message: string;
    name: string;
    stack?: string;
  };
  targetType: 'err';
};
export type RTargetType = 'raw' | 'ptr' | 'err';
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
export type RObjAtomicData<T> = T | (T | null)[] | RObjectTreeAtomic<T>;
export type RObjectTree<T> = RObjectTreeImpl<(RObjectTree<T> | RawType | T)[]>;
export type RObjectTreeAtomic<T> = RObjectTreeImpl<(T | null)[]>;
type RObjectTreeImpl<T> = {
  type: RType;
  names: (string | null)[] | null;
  values: T;
  missing?: boolean[];
};

function newRObjFromTarget(target: RTargetObj): RObjImpl {
  const obj = target.obj;

  // Conversion of RObjectTree type JS objects
  if (isRObjectTree(obj)) {
    return new (getRObjClass(RTypeMap[obj.type]))(obj);
  }

  // Conversion of explicit R NULL value
  if (obj && typeof obj === 'object' && 'type' in obj && obj.type === 'null') {
    return new RObjNull();
  }

  // Direct conversion of scalar JS values
  if (obj === null) {
    return new RObjLogical({ type: 'logical', names: null, values: [null] });
  }
  if (typeof obj === 'boolean') {
    return new RObjLogical(obj);
  }
  if (typeof obj === 'number') {
    return new RObjDouble(obj);
  }
  if (typeof obj === 'object' && 're' in obj && 'im' in obj) {
    return new RObjComplex(obj as Complex);
  }
  if (typeof obj === 'string') {
    return new RObjCharacter(obj);
  }

  // JS arrays are interpreted using R's c() function, so as to match
  // R's built in coercion rules
  if (Array.isArray(obj)) {
    const objs = obj.map((el) => newRObjFromTarget({ targetType: 'raw', obj: el }));
    const cString = Module.allocateUTF8('c');
    const call = RObjImpl.protect(
      RObjImpl.wrap(Module._Rf_allocVector(RTypeMap.call, objs.length + 1)) as RObjPairlist
    );
    call.setcar(RObjImpl.wrap(Module._Rf_install(cString)));
    let next = call.cdr();
    let i = 0;
    while (!next.isNull()) {
      next.setcar(objs[i++]);
      next = next.cdr();
    }
    const res = RObjImpl.wrap(Module._Rf_eval(call.ptr, RObjImpl.baseEnv.ptr));
    RObjImpl.unprotect(1);
    Module._free(cString);
    return res;
  }

  throw new Error('Robj construction for this JS object is not yet supported');
}

export class RObjImpl {
  ptr: RPtr;

  constructor(target: RTargetObj | RawType) {
    this.ptr = 0;
    if (isRTargetObj(target)) {
      if (target.targetType === 'ptr') {
        this.ptr = target.obj.ptr;
        return this;
      }
      if (target.targetType === 'raw') {
        return newRObjFromTarget(target);
      }
    }
    return newRObjFromTarget({ targetType: 'raw', obj: target });
  }

  get [Symbol.toStringTag](): string {
    return `RObj:${this.type()}`;
  }

  type(): RType {
    const typeNumber = Module._TYPEOF(this.ptr) as RTypeNumber;
    const type = Object.keys(RTypeMap).find(
      (typeName) => RTypeMap[typeName as RType] === typeNumber
    );
    return type as RType;
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
    return Module._TYPEOF(this.ptr) === RTypeMap.null;
  }

  isUnbound(): boolean {
    return this.ptr === RObjImpl.unboundValue.ptr;
  }

  attrs(): Nullable<RObjPairlist> {
    return RObjImpl.wrap(Module._ATTRIB(this.ptr)) as RObjPairlist;
  }

  setNames(values: (string | null)[] | null): this {
    let namesObj: RObjImpl;
    if (values === null) {
      namesObj = RObjImpl.null;
      RObjImpl.protect(namesObj);
    } else if (Array.isArray(values) && values.every((v) => typeof v === 'string' || v === null)) {
      namesObj = new RObjCharacter(values);
    } else {
      throw new Error('Argument to setNames must be null or an Array of strings or null');
    }
    Module._Rf_setAttrib(this.ptr, RObjImpl.namesSymbol.ptr, namesObj.ptr);
    RObjImpl.unprotect(1);
    return this;
  }

  names(): (string | null)[] | null {
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

    const valueObj = isRObjImpl(value) ? value : new RObjImpl({ obj: value, targetType: 'raw' });

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
    return RObjImpl.wrap(Module.getValue(Module._R_NilValue, '*')) as RObjNull;
  }

  static get naLogical(): number {
    return Module.getValue(Module._R_NaInt, 'i32');
  }

  static get naInteger(): number {
    return Module.getValue(Module._R_NaInt, 'i32');
  }

  static get naDouble(): number {
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
    return new (getRObjClass(type as RTypeNumber))({ targetType: 'ptr', obj: { ptr } });
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
    super({ targetType: 'ptr', obj: { ptr: Module.getValue(Module._R_NilValue, '*') } });
    return this;
  }

  toTree(): { type: 'null' } {
    return { type: 'null' };
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
    list.setNames(isRObjectTree(val) ? val.names : null);
    super({ targetType: 'ptr', obj: { ptr: list.ptr } });
  }

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
  constructor(val: RawType | (RawType | null)[] | RTargetPtr | RObjectTree<RTargetObj>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.list, values.length));
    values.forEach((v, i) => {
      Module._SET_VECTOR_ELT(ptr, i, new RObjImpl(v).ptr);
    });
    RObjImpl.wrap(ptr).setNames(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ targetType: 'ptr', obj: { ptr } });
  }

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
      isRObjImpl(arg) ? arg : new RObjImpl({ obj: arg, targetType: 'raw' })
    );
    const call = RObjImpl.protect(
      RObjImpl.wrap(Module._Rf_allocVector(RTypeMap.call, args.length + 1)) as RObjPairlist
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
  constructor(val: RTargetPtr | RObjectTree<RTargetObj>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const ptr = Module._Rf_protect(Module._R_NewEnv(RObjImpl.globalEnv.ptr, 0, 0));
    val.values.forEach((v, i) => {
      const name = val.names ? val.names[i] : null;
      if (!name) {
        throw new Error('Unable to create object in new environment with empty symbol name');
      }
      const namePtr = Module.allocateUTF8(name);
      Module._Rf_defineVar(Module._Rf_install(namePtr), new RObjImpl(v).ptr, ptr);
      Module._free(namePtr);
    });
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ targetType: 'ptr', obj: { ptr } });
  }

  ls(all = false, sorted = true): string[] {
    const ls = RObjImpl.wrap(
      Module._R_lsInternal3(this.ptr, Number(all), Number(sorted))
    ) as RObjCharacter;
    return ls.toArray() as string[];
  }

  bind(name: string, value: RObjImpl | RawType): void {
    const namePtr = Module.allocateUTF8(name);
    Module._Rf_defineVar(
      Module._Rf_install(namePtr),
      isRObjImpl(value) ? value.ptr : new RObjImpl({ targetType: 'raw', obj: value }).ptr,
      this.ptr
    );
    Module._free(namePtr);
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
    };
  }
}

export class RObjLogical extends RObjAtomicVector<boolean> {
  constructor(val: RTargetObj | RObjAtomicData<boolean>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.logical, values.length));
    const data = Module._LOGICAL(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 4 * i, v === null ? RObjImpl.naLogical : Boolean(v), 'i32')
    );
    RObjImpl.wrap(ptr).setNames(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ targetType: 'ptr', obj: { ptr } });
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
  constructor(val: RTargetObj | RObjAtomicData<number>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.integer, values.length));
    const data = Module._INTEGER(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 4 * i, v === null ? RObjImpl.naInteger : Math.round(Number(v)), 'i32')
    );
    RObjImpl.wrap(ptr).setNames(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ targetType: 'ptr', obj: { ptr } });
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
  constructor(val: RTargetObj | RObjAtomicData<number>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.double, values.length));
    const data = Module._REAL(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 8 * i, v === null ? RObjImpl.naDouble : v, 'double')
    );
    RObjImpl.wrap(ptr).setNames(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ targetType: 'ptr', obj: { ptr } });
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
  constructor(val: RTargetObj | RObjAtomicData<Complex>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.complex, values.length));
    const data = Module._COMPLEX(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 8 * (2 * i), v === null ? RObjImpl.naDouble : v.re, 'double')
    );
    values.forEach((v, i) =>
      Module.setValue(data + 8 * (2 * i + 1), v === null ? RObjImpl.naDouble : v.im, 'double')
    );
    RObjImpl.wrap(ptr).setNames(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ targetType: 'ptr', obj: { ptr } });
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
  constructor(val: RTargetObj | RObjAtomicData<string>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.character, values.length));
    values.forEach((v, i) => {
      if (v === null) {
        Module._SET_STRING_ELT(ptr, i, RObjImpl.naString.ptr);
      } else {
        const str = Module.allocateUTF8(String(v));
        Module._SET_STRING_ELT(ptr, i, Module._Rf_mkChar(str));
        Module._free(str);
      }
    });
    RObjImpl.wrap(ptr).setNames(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ targetType: 'ptr', obj: { ptr } });
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
  constructor(val: RTargetObj | RObjAtomicData<number>) {
    if (isRTargetObj(val)) {
      super(val);
      return this;
    }
    const values = isRObjectTree(val) ? val.values : Array.isArray(val) ? val : [val];
    if (values.some((v) => v === null || v > 255 || v < 0)) {
      throw new Error('Cannot create new RRaw object');
    }
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.raw, values.length));
    const data = Module._RAW(ptr);
    values.forEach((v, i) => Module.setValue(data + i, Number(v), 'i8'));
    RObjImpl.wrap(ptr).setNames(isRObjectTree(val) ? val.names : null);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ targetType: 'ptr', obj: { ptr } });
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
  return value && typeof value === 'object' && 'targetType' in value && 'obj' in value;
}

/**
 * Test for an RTargetPtr instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RTargetPtr.
 */
export function isRTargetPtr(value: any): value is RTargetPtr {
  return isRTargetObj(value) && value.targetType === 'ptr';
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
    value &&
    typeof value === 'object' &&
    (Array.isArray(value.names) || value.names === null) &&
    Object.keys(RTypeMap).includes(value.type as string)
  );
}

export function getRObjClass(type: RTypeNumber): typeof RObjImpl {
  const typeClasses: { [key: number]: typeof RObjImpl } = {
    [RTypeMap.null]: RObjNull,
    [RTypeMap.symbol]: RObjSymbol,
    [RTypeMap.pairlist]: RObjPairlist,
    [RTypeMap.closure]: RObjFunction,
    [RTypeMap.environment]: RObjEnvironment,
    [RTypeMap.call]: RObjPairlist,
    [RTypeMap.special]: RObjFunction,
    [RTypeMap.builtin]: RObjFunction,
    [RTypeMap.string]: RObjString,
    [RTypeMap.logical]: RObjLogical,
    [RTypeMap.integer]: RObjInteger,
    [RTypeMap.double]: RObjDouble,
    [RTypeMap.complex]: RObjComplex,
    [RTypeMap.character]: RObjCharacter,
    [RTypeMap.list]: RObjList,
    [RTypeMap.raw]: RObjRaw,
    [RTypeMap.function]: RObjFunction,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  return RObjImpl;
}
