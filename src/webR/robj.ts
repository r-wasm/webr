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

export type WebRPayloadRaw = {
  obj: RawType;
  payloadType: 'raw';
};

export type WebRPayloadPtr = {
  obj: {
    type?: RType;
    ptr: RPtr;
    methods?: string[];
  };
  payloadType: 'ptr';
};

export type WebRPayloadErr = {
  obj: {
    message: string;
    name: string;
    stack?: string;
  };
  payloadType: 'err';
};
export type WebRPayload = WebRPayloadRaw | WebRPayloadPtr | WebRPayloadErr;

type Nullable<T> = T | RObjNull;

export type Complex = {
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

/**
 * RObjData is a union of the JavaScript types that are able to be converted
 * into an R object.
 *
 * RObjData is used both as a general input argument for R object construction
 * and also as a general return type when converting R objects into JavaScript.
 *
 * The type parameter, T, chooses how references to R objects are implemented.
 * This is required because there are different ways to represent a reference to
 * an R object in webR. Instances of the RObjImpl class are used on the worker
 * thread, while proxies of type RObject targeting a WebRPayloadPtr object
 * are used on the main thread. Conversion between the reference types is
 * handled automatically during proxy communication.
 */
export type RObjData<T = RObjImpl> =
  | RawType
  | T
  | RObjTree<T>
  | RObjData<T>[]
  | { [key: string]: RObjData<T> };

/**
 * A subset of {@link RObjData} for JavaScript objects that can be converted
 * into R atomic vectors. The parameter T is the JavaScript scalar type
 * associated with the vector.
 */
export type RObjAtomicData<T> = T | (T | null)[] | RObjTreeAtomic<T> | NamedObject<T | null>;

/**
 * RObjTree is a union of types forming a tree structure, used when serialising
 * R objects into a JavaScript respresentation.
 *
 * Nested R objects are serialised using the RObjTreeNode type, forming branches
 * in the resulting tree structure, with leaves formed by the remaining types.
 */
export type RObjTree<T = RObjImpl> =
  | RObjTreeNull
  | RObjTreeString
  | RObjTreeSymbol
  | RObjTreeNode<T>
  | RObjTreeAtomic<atomicType>;

export type RObjTreeNull = {
  type: 'null';
};
export type RObjTreeString = {
  type: 'string';
  value: string;
};
export type RObjTreeSymbol = {
  type: 'symbol';
  printname: string | null;
  symvalue: RPtr | null;
  internal: RPtr | null;
};
export type RObjTreeNode<T = RObjImpl> = {
  type: 'list' | 'pairlist' | 'environment';
  names: (string | null)[] | null;
  values: (RawType | T | RObjTree<T>)[];
};
export type RObjTreeAtomic<T> = {
  type: 'logical' | 'integer' | 'double' | 'complex' | 'character' | 'raw';
  names: (string | null)[] | null;
  values: (T | null)[];
};

function newRObjFromData(obj: RObjData): RObjImpl {
  // Conversion of RObjTree type JS objects
  if (isRObjTree(obj)) {
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
  if (typeof obj === 'string') {
    return new RObjCharacter(obj);
  }
  if (isComplex(obj)) {
    return new RObjComplex(obj);
  }

  // JS arrays are interpreted using R's c() function, so as to match
  // R's built in coercion rules
  if (Array.isArray(obj)) {
    const objs = obj.map((el) => newRObjFromData(el));
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

  constructor(data: WebRPayload | RObjData) {
    this.ptr = 0;
    if (isRObjImpl(data)) {
      this.ptr = data.ptr;
      return this;
    }
    if (isWebRPayloadPtr(data)) {
      this.ptr = data.obj.ptr;
      return this;
    }
    if (isWebRPayloadRaw(data)) {
      return newRObjFromData(data.obj);
    }
    return newRObjFromData(data);
  }

  get [Symbol.toStringTag](): string {
    return `RObj:${this.type()}`;
  }

  static getStaticPropertyValue(prop: keyof typeof RObjImpl): unknown {
    return RObjImpl[prop];
  }

  getPropertyValue(prop: keyof this): unknown {
    return this[prop];
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

  toTree(options: ToTreeOptions = { depth: 0 }, depth = 1): RObjTree {
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

    const valueObj = isRObjImpl(value) ? value : new RObjImpl({ obj: value, payloadType: 'raw' });

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

  static get true(): RObjLogical {
    return RObjImpl.wrap(Module.getValue(Module._R_TrueValue, '*')) as RObjLogical;
  }

  static get false(): RObjLogical {
    return RObjImpl.wrap(Module.getValue(Module._R_FalseValue, '*')) as RObjLogical;
  }

  static get logicalNA(): RObjLogical {
    return RObjImpl.wrap(Module.getValue(Module._R_LogicalNAValue, '*')) as RObjLogical;
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
    return new (getRObjClass(type as RTypeNumber))({ payloadType: 'ptr', obj: { ptr } });
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
    super({ payloadType: 'ptr', obj: { ptr: Module.getValue(Module._R_NilValue, '*') } });
    return this;
  }

  toTree(): RObjTreeNull {
    return { type: 'null' };
  }
}

export class RObjSymbol extends RObjImpl {
  toTree(): RObjTreeSymbol {
    const obj = this.toObject();
    return {
      type: 'symbol',
      printname: obj.printname,
      symvalue: obj.symvalue,
      internal: obj.internal,
    };
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
  constructor(val: WebRPayload | RObjData) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }
    const { names, values } = toRObjData(val);
    const list = RObjImpl.wrap(Module._Rf_allocList(values.length)) as RObjPairlist;
    list.preserve();
    for (
      let [i, next] = [0, list as Nullable<RObjPairlist>];
      !next.isNull();
      [i, next] = [i + 1, next.cdr()]
    ) {
      next.setcar(new RObjImpl(values[i]));
    }
    list.setNames(names);
    super({ payloadType: 'ptr', obj: { ptr: list.ptr } });
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

  toTree(options: ToTreeOptions = { depth: 0 }, depth = 1): RObjTreeNode {
    const namesArray: string[] = [];
    let hasNames = false;
    const values: RObjTreeNode['values'] = [];

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
    return { type: 'pairlist', names, values };
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
  constructor(val: WebRPayload | RObjData) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }
    const { names, values } = toRObjData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.list, values.length));
    values.forEach((v, i) => {
      Module._SET_VECTOR_ELT(ptr, i, new RObjImpl(v).ptr);
    });
    RObjImpl.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
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

  toTree(options: { depth: number } = { depth: 0 }, depth = 1): RObjTreeNode {
    return {
      type: 'list',
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
      isRObjImpl(arg) ? arg : new RObjImpl({ obj: arg, payloadType: 'raw' })
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

  toTree(): RObjTreeString {
    return {
      type: 'string',
      value: this.toString(),
    };
  }
}

export class RObjEnvironment extends RObjImpl {
  constructor(val: WebRPayload | RObjData = {}) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }
    const { names, values } = toRObjData(val);
    const ptr = Module._Rf_protect(Module._R_NewEnv(RObjImpl.globalEnv.ptr, 0, 0));
    values.forEach((v, i) => {
      const name = names ? names[i] : null;
      if (!name) {
        throw new Error('Unable to create object in new environment with empty symbol name');
      }
      const namePtr = Module.allocateUTF8(name);
      Module._Rf_defineVar(Module._Rf_install(namePtr), new RObjImpl(v).ptr, ptr);
      Module._free(namePtr);
    });
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
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
      isRObjImpl(value) ? value.ptr : new RObjImpl({ payloadType: 'raw', obj: value }).ptr,
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

  toObject({ depth = 0 } = {}): NamedObject<RObjData> {
    const symbols = this.names();
    return Object.fromEntries(
      [...Array(symbols.length).keys()].map((i) => {
        return [symbols[i], this.getDollar(symbols[i]).toTree({ depth })];
      })
    );
  }

  toTree(options: { depth: number } = { depth: 0 }, depth = 1): RObjTreeNode {
    const names = this.names();
    const values = [...Array(names.length).keys()].map((i) => {
      if (options.depth && depth >= options.depth) {
        return this.getDollar(names[i]);
      } else {
        return this.getDollar(names[i]).toTree(options, depth + 1);
      }
    });

    return {
      type: 'environment',
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

  toTree(): RObjTreeAtomic<T> {
    return {
      type: this.type() as 'logical' | 'integer' | 'double' | 'complex' | 'character' | 'raw',
      names: this.names(),
      values: this.toArray(),
    };
  }
}

export class RObjLogical extends RObjAtomicVector<boolean> {
  constructor(val: WebRPayload | RObjAtomicData<boolean>) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }
    const { names, values } = toRObjData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.logical, values.length));
    const data = Module._LOGICAL(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 4 * i, v === null ? RObjImpl.naLogical : Boolean(v), 'i32')
    );
    RObjImpl.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
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
  constructor(val: WebRPayload | RObjAtomicData<number>) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }
    const { names, values } = toRObjData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.integer, values.length));
    const data = Module._INTEGER(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 4 * i, v === null ? RObjImpl.naInteger : Math.round(Number(v)), 'i32')
    );
    RObjImpl.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
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
  constructor(val: WebRPayload | RObjAtomicData<number>) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }
    const { names, values } = toRObjData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.double, values.length));
    const data = Module._REAL(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 8 * i, v === null ? RObjImpl.naDouble : v, 'double')
    );
    RObjImpl.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
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
  constructor(val: WebRPayload | RObjAtomicData<Complex>) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }
    const { names, values } = toRObjData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.complex, values.length));
    const data = Module._COMPLEX(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 8 * (2 * i), v === null ? RObjImpl.naDouble : v.re, 'double')
    );
    values.forEach((v, i) =>
      Module.setValue(data + 8 * (2 * i + 1), v === null ? RObjImpl.naDouble : v.im, 'double')
    );
    RObjImpl.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
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
  constructor(val: WebRPayload | RObjAtomicData<string>) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }
    const { names, values } = toRObjData(val);
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
    RObjImpl.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
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
  constructor(val: WebRPayload | RObjAtomicData<number>) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }
    const { names, values } = toRObjData(val);
    if (values.some((v) => v === null || v > 255 || v < 0)) {
      throw new Error('Cannot create new RRaw object');
    }
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.raw, values.length));
    const data = Module._RAW(ptr);
    values.forEach((v, i) => Module.setValue(data + i, Number(v), 'i8'));
    RObjImpl.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
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
    'payloadType' in value &&
    isWebRPayloadPtr(value._payload)
  );
}

/**
 * Test for an WebRPayload instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an WebRPayload.
 */
export function isWebRPayload(value: any): value is WebRPayload {
  return value && typeof value === 'object' && 'payloadType' in value && 'obj' in value;
}

/**
 * Test for an WebRPayloadPtr instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an WebRPayloadPtr.
 */
export function isWebRPayloadPtr(value: any): value is WebRPayloadPtr {
  return isWebRPayload(value) && value.payloadType === 'ptr';
}

/**
 * Test for an WebRPayloadRaw instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an WebRPayloadRaw.
 */
export function isWebRPayloadRaw(value: any): value is WebRPayloadRaw {
  return isWebRPayload(value) && value.payloadType === 'raw';
}

/**
 * Test for an RFunction instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RFunction.
 */
export function isRFunction(value: any): value is RFunction {
  return Boolean(isRObject(value) && value._payload.obj.methods?.includes('exec'));
}

/**
 * Test for an RObjTree instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RObjTree.
 */
export function isRObjTree(value: any): value is RObjTree<any> {
  return value && typeof value === 'object' && Object.keys(RTypeMap).includes(value.type as string);
}

/**
 * Test if an object is of type Complex
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is of type Complex.
 */
export function isComplex(value: any): value is Complex {
  return value && typeof value === 'object' && 're' in value && 'im' in value;
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

/*
 * Convert the various types possible in the type union RObjData into
 * consistently typed arrays of names and values.
 */
function toRObjData<T>(jsObj: RObjAtomicData<T>): {
  names: (string | null)[] | null;
  values: (T | null)[];
};
function toRObjData(jsObj: RObjData): RObjData;
function toRObjData(jsObj: RObjData): RObjData {
  if (isRObjTree(jsObj)) {
    return jsObj;
  } else if (Array.isArray(jsObj)) {
    return { names: null, values: jsObj };
  } else if (jsObj && typeof jsObj === 'object' && !isComplex(jsObj)) {
    return {
      names: Object.keys(jsObj),
      values: Object.values(jsObj),
    };
  }
  return { names: null, values: [jsObj] };
}
