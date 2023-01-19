import { Module } from './emscripten';
import { WebRPayload, isWebRPayload, isWebRPayloadPtr, isWebRPayloadRaw } from './payload';
import { Complex, isComplex, NamedEntries, NamedObject, WebRDataRaw } from './robj';
import { WebRData, WebRDataAtomic, RPtr, RType, RTypeMap, RTypeNumber } from './robj';
import { envPoke, parseEvalBare, protect, protectInc, unprotect } from './utils-r';
import { protectWithIndex, reprotect, unprotectIndex } from './utils-r';
import { isWebRDataTree, WebRDataTree, WebRDataTreeAtomic, WebRDataTreeNode } from './tree';
import { WebRDataTreeNull, WebRDataTreeString, WebRDataTreeSymbol } from './tree';

export type RHandle = RObject | RPtr;

export function handlePtr(x: RHandle): RPtr {
  if (isRObject(x)) {
    return x.ptr;
  } else {
    return x;
  }
}

// Use this for implicit protection of objects sent to the main
// thread. Currently uses the precious list but could use a different
// mechanism in the future. Unprotection is explicit through
// `RObject.free()`.
function keep(x: RHandle) {
  Module._R_PreserveObject(handlePtr(x));
}

export interface ToTreeOptions {
  depth: number;
}

type Nullable<T> = T | RNull;

function newObjectFromData(obj: WebRData): RObject {
  // Conversion of WebRDataTree type JS objects
  if (isWebRDataTree(obj)) {
    return new (getRWorkerClass(RTypeMap[obj.type]))(obj);
  }

  // Conversion of explicit R NULL value
  if (obj && typeof obj === 'object' && 'type' in obj && obj.type === 'null') {
    return new RNull();
  }

  // Direct conversion of scalar JS values
  if (obj === null) {
    return new RLogical({ type: 'logical', names: null, values: [null] });
  }
  if (typeof obj === 'boolean') {
    return new RLogical(obj);
  }
  if (typeof obj === 'number') {
    return new RDouble(obj);
  }
  if (typeof obj === 'string') {
    return new RCharacter(obj);
  }
  if (isComplex(obj)) {
    return new RComplex(obj);
  }
  if (Array.isArray(obj)) {
    return newObjectFromArray(obj);
  }

  throw new Error('Robj construction for this JS object is not yet supported');
}

// JS arrays are interpreted using R's c() function, so as to match
// R's built in coercion rules
function newObjectFromArray(arr: WebRData[]) {
  const prot = { n: 0 };

  try {
    const objs = arr.map((el) => protectInc(newObjectFromData(el), prot));

    const call = RPairlist.wrap(Module._Rf_allocVector(RTypeMap.call, objs.length + 1));
    protectInc(call, prot);

    call.setcar(new RSymbol('c'));

    let next = call.cdr();
    let i = 0;

    while (!next.isNull()) {
      next.setcar(objs[i++]);
      next = next.cdr();
    }

    return RObject.wrap(Module._Rf_eval(call.ptr, RObject.baseEnv.ptr));
  } finally {
    unprotect(prot.n);
  }
}

// FIXME: Can we simplify this?
// Do we need to take payloads?
export type RObjectData = WebRPayload | WebRData;

export class RObject {
  ptr: RPtr;

  constructor(data: RObjectData) {
    this.ptr = 0;
    if (isRObject(data)) {
      this.ptr = data.ptr;
      return this;
    }
    if (isWebRPayloadPtr(data)) {
      this.ptr = data.obj.ptr;
      return this;
    }
    if (isWebRPayloadRaw(data)) {
      return newObjectFromData(data.obj);
    }
    return newObjectFromData(data);
  }

  static wrap<T extends typeof RObject>(this: T, ptr: RPtr): InstanceType<T> {
    const type = Module._TYPEOF(ptr);

    return new (getRWorkerClass(type as RTypeNumber))({
      payloadType: 'ptr',
      obj: { ptr },
    }) as InstanceType<T>;
  }

  get [Symbol.toStringTag](): string {
    return `RObject:${this.type()}`;
  }

  static getStaticPropertyValue(prop: keyof typeof RObject): unknown {
    return RObject[prop];
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

  // Frees objects preserved with `keep()`. This method is called by
  // users in the main thread to release objects that were
  // automatically protected before being sent away.
  free(): void {
    Module._R_ReleaseObject(this.ptr);
  }

  // TODO: Remove these
  protect(): void {
    this.ptr = Module._Rf_protect(this.ptr);
  }
  unprotect(): void {
    Module._Rf_unprotect_ptr(this.ptr);
  }

  // TODO: Remove these
  preserve(): void {
    Module._R_PreserveObject(this.ptr);
  }
  release(): void {
    Module._R_ReleaseObject(this.ptr);
  }

  inspect(): void {
    parseEvalBare('.Internal(inspect(x))', { x: this });
  }

  isNull(): this is RNull {
    return Module._TYPEOF(this.ptr) === RTypeMap.null;
  }

  isUnbound(): boolean {
    return this.ptr === RObject.unboundValue.ptr;
  }

  attrs(): Nullable<RPairlist> {
    return RPairlist.wrap(Module._ATTRIB(this.ptr));
  }

  setNames(values: (string | null)[] | null): this {
    let namesObj: RObject;

    if (values === null) {
      namesObj = RObject.null;
    } else if (Array.isArray(values) && values.every((v) => typeof v === 'string' || v === null)) {
      namesObj = new RCharacter(values);
    } else {
      throw new Error('Argument to setNames must be null or an Array of strings or null');
    }

    // `setAttrib()` protects its inputs
    Module._Rf_setAttrib(this.ptr, RObject.namesSymbol.ptr, namesObj.ptr);
    return this;
  }

  names(): (string | null)[] | null {
    const names = RCharacter.wrap(Module._Rf_getAttrib(this.ptr, RObject.namesSymbol.ptr));
    if (names.isNull()) {
      return null;
    } else {
      return names.toArray();
    }
  }

  includes(name: string) {
    const names = this.names();
    return names && names.includes(name);
  }

  toTree(options: ToTreeOptions = { depth: 0 }, depth = 1): WebRDataTree {
    throw new Error('This R object cannot be converted to JS');
  }

  toJs() {
    return this.toTree() as ReturnType<this['toTree']>;
  }

  subset(prop: number | string): RObject {
    return this.#slice(prop, RObject.bracketSymbol.ptr);
  }

  get(prop: number | string): RObject {
    return this.#slice(prop, RObject.bracket2Symbol.ptr);
  }

  getDollar(prop: string): RObject {
    return this.#slice(prop, RObject.dollarSymbol.ptr);
  }

  #slice(prop: number | string, op: RPtr): RObject {
    const prot = { n: 0 };

    try {
      const idx = new RObject(prop);
      protectInc(idx, prot);

      const call = Module._Rf_lang3(op, this.ptr, idx.ptr);
      protectInc(call, prot);

      return RObject.wrap(Module._Rf_eval(call, RObject.baseEnv.ptr));
    } finally {
      unprotect(prot.n);
    }
  }

  pluck(...path: (string | number)[]): RObject | undefined {
    const index = protectWithIndex(RObject.null);

    try {
      const getter = (obj: RObject, prop: string | number): RObject => {
        const out = obj.get(prop);
        return reprotect(out, index);
      };
      const result = path.reduce(getter, this);

      return result.isNull() ? undefined : result;
    } catch (err) {
      // Deal with subscript out of bounds error
      if (err === Infinity) {
        return undefined;
      }
      throw err;
    } finally {
      unprotectIndex(index);
    }
  }

  set(prop: string | number, value: RObject | WebRDataRaw) {
    const prot = { n: 0 };

    try {
      const idx = new RObject(prop);
      protectInc(idx, prot);

      const valueObj = new RObject(value);
      protectInc(valueObj, prot);

      const assign = new RSymbol('[[<-');
      const call = Module._Rf_lang4(assign.ptr, this.ptr, idx.ptr, valueObj.ptr);
      protectInc(call, prot);

      return RObject.wrap(Module._Rf_eval(call, RObject.baseEnv.ptr));
    } finally {
      unprotect(prot.n);
    }
  }

  static getMethods(obj: RObject) {
    const props = new Set<string>();
    let cur: unknown = obj;
    do {
      Object.getOwnPropertyNames(cur).map((p) => props.add(p));
    } while ((cur = Object.getPrototypeOf(cur)));
    return [...props.keys()].filter((i) => typeof obj[i as keyof typeof obj] === 'function');
  }

  static get globalEnv(): RObject {
    return RObject.wrap(Module.getValue(Module._R_GlobalEnv, '*'));
  }

  static get emptyEnv(): RObject {
    return RObject.wrap(Module.getValue(Module._R_EmptyEnv, '*'));
  }

  static get baseEnv(): RObject {
    return RObject.wrap(Module.getValue(Module._R_BaseEnv, '*'));
  }

  static get null(): RNull {
    return RNull.wrap(Module.getValue(Module._R_NilValue, '*'));
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

  static get naString(): RObject {
    return RObject.wrap(Module.getValue(Module._R_NaString, '*'));
  }

  static get true(): RLogical {
    return RLogical.wrap(Module.getValue(Module._R_TrueValue, '*'));
  }

  static get false(): RLogical {
    return RLogical.wrap(Module.getValue(Module._R_FalseValue, '*'));
  }

  static get logicalNA(): RLogical {
    return RLogical.wrap(Module.getValue(Module._R_LogicalNAValue, '*'));
  }

  static get unboundValue(): RObject {
    return RObject.wrap(Module.getValue(Module._R_UnboundValue, '*'));
  }

  static get bracketSymbol(): RSymbol {
    return RSymbol.wrap(Module.getValue(Module._R_BracketSymbol, '*'));
  }

  static get bracket2Symbol(): RSymbol {
    return RSymbol.wrap(Module.getValue(Module._R_Bracket2Symbol, '*'));
  }

  static get dollarSymbol(): RSymbol {
    return RSymbol.wrap(Module.getValue(Module._R_DollarSymbol, '*'));
  }

  static get namesSymbol(): RSymbol {
    return RSymbol.wrap(Module.getValue(Module._R_NamesSymbol, '*'));
  }

  static protect<T extends RObject>(obj: T): T {
    return RObject.wrap(Module._Rf_protect(obj.ptr)) as T;
  }

  static unprotect(n: number): void {
    Module._Rf_unprotect(n);
  }

  static unprotectPtr(obj: RObject): void {
    Module._Rf_unprotect_ptr(obj.ptr);
  }

  static preserveObject(obj: RObject): void {
    Module._R_PreserveObject(obj.ptr);
  }

  static releaseObject(obj: RObject): void {
    Module._R_ReleaseObject(obj.ptr);
  }
}

export class RNull extends RObject {
  constructor() {
    super({ payloadType: 'ptr', obj: { ptr: Module.getValue(Module._R_NilValue, '*') } });
    return this;
  }

  toTree(): WebRDataTreeNull {
    return { type: 'null' };
  }
}

export class RSymbol extends RObject {
  // Note that symbols don't need to be protected. This also means
  // that allocating symbols in loops with random data is probably a
  // bad idea because this leaks memory.
  constructor(x: string) {
    if (typeof x !== 'string') {
      super(x);
      return;
    }

    const name = Module.allocateUTF8(x);

    try {
      super(RObject.wrap(Module._Rf_install(name)));
    } finally {
      Module._free(name);
    }
  }

  toTree(): WebRDataTreeSymbol {
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

  toString(): string {
    return this.printname().toString();
  }

  printname(): RString {
    return RString.wrap(Module._PRINTNAME(this.ptr));
  }
  symvalue(): RObject {
    return RObject.wrap(Module._SYMVALUE(this.ptr));
  }
  internal(): RObject {
    return RObject.wrap(Module._INTERNAL(this.ptr));
  }
}

export class RPairlist extends RObject {
  constructor(val: WebRPayload | WebRData) {
    if (isWebRPayload(val) || isRObject(val)) {
      super(val);
      return this;
    }

    const prot = { n: 0 };

    try {
      const { names, values } = toWebRData(val);

      const list = RPairlist.wrap(Module._Rf_allocList(values.length));
      protectInc(list, prot);

      for (
        let [i, next] = [0, list as Nullable<RPairlist>];
        !next.isNull();
        [i, next] = [i + 1, next.cdr()]
      ) {
        next.setcar(new RObject(values[i]));
      }

      list.setNames(names);
      super({ payloadType: 'ptr', obj: { ptr: list.ptr } });
      keep(this);
    } finally {
      unprotect(prot.n);
    }
  }

  get length(): number {
    return this.toArray().length;
  }

  toArray(options: ToTreeOptions = { depth: 1 }): WebRData[] {
    return this.toTree(options).values;
  }

  toObject({
    allowDuplicateKey = true,
    allowEmptyKey = false,
    depth = 1,
  } = {}): NamedObject<WebRData> {
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

  entries(options: ToTreeOptions = { depth: 1 }): NamedEntries<WebRData> {
    const obj = this.toTree(options);
    return obj.values.map((v, i) => [obj.names ? obj.names[i] : null, v]);
  }

  toTree(options: ToTreeOptions = { depth: 0 }, depth = 1): WebRDataTreeNode {
    const namesArray: string[] = [];
    let hasNames = false;
    const values: WebRDataTreeNode['values'] = [];

    for (let next = this as Nullable<RPairlist>; !next.isNull(); next = next.cdr()) {
      const symbol = next.tag();
      if (symbol.isNull()) {
        namesArray.push('');
      } else {
        hasNames = true;
        namesArray.push(symbol.toString());
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

  setcar(obj: RObject): void {
    Module._SETCAR(this.ptr, obj.ptr);
  }

  car(): RObject {
    return RObject.wrap(Module._CAR(this.ptr));
  }

  cdr(): Nullable<RPairlist> {
    return RObject.wrap(Module._CDR(this.ptr)) as Nullable<RPairlist>;
  }

  tag(): Nullable<RSymbol> {
    return RObject.wrap(Module._TAG(this.ptr)) as Nullable<RSymbol>;
  }
}

export class RList extends RObject {
  constructor(val: WebRPayload | WebRData) {
    if (isWebRPayload(val) || isRObject(val)) {
      super(val);
      return this;
    }

    const prot = { n: 0 };

    try {
      const { names, values } = toWebRData(val);
      const ptr = Module._Rf_allocVector(RTypeMap.list, values.length);
      protectInc(ptr, prot);

      values.forEach((v, i) => {
        Module._SET_VECTOR_ELT(ptr, i, new RObject(v).ptr);
      });

      RObject.wrap(ptr).setNames(names);

      super({ payloadType: 'ptr', obj: { ptr } });
      keep(ptr);
    } finally {
      unprotect(prot.n);
    }
  }

  get length(): number {
    return Module._LENGTH(this.ptr);
  }

  toArray(options: { depth: number } = { depth: 1 }): WebRData[] {
    return this.toTree(options).values;
  }

  toObject({
    allowDuplicateKey = true,
    allowEmptyKey = false,
    depth = 1,
  } = {}): NamedObject<WebRData> {
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

  entries(options: { depth: number } = { depth: 1 }): NamedEntries<WebRData> {
    const obj = this.toTree(options);
    return obj.values.map((v, i) => [obj.names ? obj.names[i] : null, v]);
  }

  toTree(options: { depth: number } = { depth: 0 }, depth = 1): WebRDataTreeNode {
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

export class RFunction extends RObject {
  exec(...args: (WebRDataRaw | RObject)[]): RObject {
    const prot = { n: 0 };

    try {
      const argObjs = args.map((arg) => protectInc(new RObject(arg), prot));

      const call = RPairlist.wrap(Module._Rf_allocVector(RTypeMap.call, args.length + 1));
      protectInc(call, prot);

      call.setcar(this);

      let c = call.cdr();
      let i = 0;
      while (!c.isNull()) {
        c.setcar(argObjs[i++]);
        c = c.cdr();
      }

      return RObject.wrap(Module._Rf_eval(call.ptr, RObject.baseEnv.ptr));
    } finally {
      unprotect(prot.n);
    }
  }
}

export class RString extends RObject {
  toString(): string {
    return Module.UTF8ToString(Module._R_CHAR(this.ptr));
  }

  toTree(): WebRDataTreeString {
    return {
      type: 'string',
      value: this.toString(),
    };
  }
}

export class REnvironment extends RObject {
  constructor(val: WebRPayload | WebRData = {}) {
    if (isWebRPayload(val) || isRObject(val)) {
      super(val);
      return this;
    }

    let nProt = 0;

    try {
      const { names, values } = toWebRData(val);

      const ptr = protect(Module._R_NewEnv(RObject.globalEnv.ptr, 0, 0));
      ++nProt;

      values.forEach((v, i) => {
        const name = names ? names[i] : null;
        if (!name) {
          throw new Error("Can't create object in new environment with empty symbol name");
        }

        const sym = new RSymbol(name);
        const vObj = protect(new RObject(v));
        try {
          envPoke(ptr, sym, vObj);
        } finally {
          unprotect(1);
        }
      });

      super({ payloadType: 'ptr', obj: { ptr } });
      keep(ptr);
    } finally {
      unprotect(nProt);
    }
  }

  ls(all = false, sorted = true): string[] {
    const ls = RCharacter.wrap(Module._R_lsInternal3(this.ptr, Number(all), Number(sorted)));
    return ls.toArray() as string[];
  }

  bind(name: string, value: RObjectData): void {
    const sym = new RSymbol(name);
    const valueObj = protect(new RObject(value));

    try {
      envPoke(this, sym, valueObj);
    } finally {
      unprotect(1);
    }
  }

  names(): string[] {
    return this.ls(true, true);
  }

  frame(): RObject {
    return RObject.wrap(Module._FRAME(this.ptr));
  }

  subset(prop: number | string): RObject {
    if (typeof prop === 'number') {
      throw new Error('Object of type environment is not subsettable');
    }
    return this.getDollar(prop);
  }

  toObject({ depth = 0 } = {}): NamedObject<WebRData> {
    const symbols = this.names();
    return Object.fromEntries(
      [...Array(symbols.length).keys()].map((i) => {
        return [symbols[i], this.getDollar(symbols[i]).toTree({ depth })];
      })
    );
  }

  toTree(options: { depth: number } = { depth: 0 }, depth = 1): WebRDataTreeNode {
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

export type atomicType = number | boolean | Complex | string;

abstract class RVectorAtomic<T extends atomicType> extends RObject {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }

  get(prop: number | string): this {
    return super.get(prop) as this;
  }

  subset(prop: number | string): this {
    return super.subset(prop) as this;
  }

  getDollar(prop: string): RObject {
    throw new Error('$ operator is invalid for atomic vectors');
  }

  detectMissing(): boolean[] {
    const prot = { n: 0 };

    try {
      const call = Module._Rf_lang2(new RSymbol('is.na').ptr, this.ptr);
      protectInc(call, prot);

      const val = RLogical.wrap(Module._Rf_eval(call, RObject.baseEnv.ptr));
      protectInc(val, prot);

      const ret = val.toTypedArray();
      return Array.from(ret).map((elt) => Boolean(elt));
    } finally {
      unprotect(prot.n);
    }
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

  toTree(): WebRDataTreeAtomic<T> {
    return {
      type: this.type() as 'logical' | 'integer' | 'double' | 'complex' | 'character' | 'raw',
      names: this.names(),
      values: this.toArray(),
    };
  }
}

export class RLogical extends RVectorAtomic<boolean> {
  constructor(val: WebRPayload | WebRDataAtomic<boolean>) {
    if (isWebRPayload(val) || isRObject(val)) {
      super(val);
      return this;
    }
    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.logical, values.length));
    const data = Module._LOGICAL(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 4 * i, v === null ? RObject.naLogical : Boolean(v), 'i32')
    );
    RObject.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
  }

  getBoolean(idx: number): boolean | null {
    return this.get(idx).toArray()[0];
  }

  toBoolean(): boolean {
    if (this.length !== 1) {
      throw new Error("Can't convert atomic vector of length > 1 to a scalar JS value");
    }
    const val = this.getBoolean(1);
    if (val === null) {
      throw new Error("Can't convert missing value `NA` to a JS boolean");
    }
    return val;
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

export class RInteger extends RVectorAtomic<number> {
  constructor(val: WebRPayload | WebRDataAtomic<number>) {
    if (isWebRPayload(val) || isRObject(val)) {
      super(val);
      return this;
    }
    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.integer, values.length));
    const data = Module._INTEGER(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 4 * i, v === null ? RObject.naInteger : Math.round(Number(v)), 'i32')
    );
    RObject.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
  }

  getNumber(idx: number): number | null {
    return this.get(idx).toArray()[0];
  }

  toNumber(): number {
    if (this.length !== 1) {
      throw new Error("Can't convert atomic vector of length > 1 to a scalar JS value");
    }
    const val = this.getNumber(1);
    if (val === null) {
      throw new Error("Can't convert missing value `NA` to a JS number");
    }
    return val;
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

export class RDouble extends RVectorAtomic<number> {
  constructor(val: WebRPayload | WebRDataAtomic<number>) {
    if (isWebRPayload(val) || isRObject(val)) {
      super(val);
      return this;
    }
    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.double, values.length));
    const data = Module._REAL(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 8 * i, v === null ? RObject.naDouble : v, 'double')
    );
    RObject.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
  }

  getNumber(idx: number): number | null {
    return this.get(idx).toArray()[0];
  }

  toNumber(): number {
    if (this.length !== 1) {
      throw new Error("Can't convert atomic vector of length > 1 to a scalar JS value");
    }
    const val = this.getNumber(1);
    if (val === null) {
      throw new Error("Can't convert missing value `NA` to a JS number");
    }
    return val;
  }

  toTypedArray(): Float64Array {
    return new Float64Array(
      Module.HEAPF64.subarray(Module._REAL(this.ptr) / 8, Module._REAL(this.ptr) / 8 + this.length)
    );
  }
}

export class RComplex extends RVectorAtomic<Complex> {
  constructor(val: WebRPayload | WebRDataAtomic<Complex>) {
    if (isWebRPayload(val) || isRObject(val)) {
      super(val);
      return this;
    }
    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.complex, values.length));
    const data = Module._COMPLEX(ptr);
    values.forEach((v, i) =>
      Module.setValue(data + 8 * (2 * i), v === null ? RObject.naDouble : v.re, 'double')
    );
    values.forEach((v, i) =>
      Module.setValue(data + 8 * (2 * i + 1), v === null ? RObject.naDouble : v.im, 'double')
    );
    RObject.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
  }

  getComplex(idx: number): Complex | null {
    return this.get(idx).toArray()[0];
  }

  toComplex(): Complex {
    if (this.length !== 1) {
      throw new Error("Can't convert atomic vector of length > 1 to a scalar JS value");
    }
    const val = this.getComplex(1);
    if (val === null) {
      throw new Error("Can't convert missing value `NA` to a JS object");
    }
    return val;
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

export class RCharacter extends RVectorAtomic<string> {
  constructor(val: WebRPayload | WebRDataAtomic<string>) {
    if (isWebRPayload(val) || isRObject(val)) {
      super(val);
      return this;
    }
    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.character, values.length));
    values.forEach((v, i) => {
      if (v === null) {
        Module._SET_STRING_ELT(ptr, i, RObject.naString.ptr);
      } else {
        const str = Module.allocateUTF8(String(v));
        Module._SET_STRING_ELT(ptr, i, Module._Rf_mkChar(str));
        Module._free(str);
      }
    });
    RObject.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
  }

  getString(idx: number): string | null {
    return this.get(idx).toArray()[0];
  }

  toString(): string {
    if (this.length !== 1) {
      throw new Error("Can't convert atomic vector of length > 1 to a scalar JS value");
    }
    const val = this.getString(1);
    if (val === null) {
      throw new Error("Can't convert missing value `NA` to a JS string");
    }
    return val;
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

export class RRaw extends RVectorAtomic<number> {
  constructor(val: WebRPayload | WebRDataAtomic<number>) {
    if (isWebRPayload(val) || isRObject(val)) {
      super(val);
      return this;
    }
    const { names, values } = toWebRData(val);
    if (values.some((v) => v === null || v > 255 || v < 0)) {
      throw new Error('Cannot create new RRaw object');
    }
    const ptr = Module._Rf_protect(Module._Rf_allocVector(RTypeMap.raw, values.length));
    const data = Module._RAW(ptr);
    values.forEach((v, i) => Module.setValue(data + i, Number(v), 'i8'));
    RObject.wrap(ptr).setNames(names);
    Module._Rf_unprotect(1);
    Module._R_PreserveObject(ptr);
    super({ payloadType: 'ptr', obj: { ptr } });
  }

  getNumber(idx: number): number | null {
    return this.get(idx).toArray()[0];
  }

  toNumber(): number {
    if (this.length !== 1) {
      throw new Error("Can't convert atomic vector of length > 1 to a scalar JS value");
    }
    const val = this.getNumber(1);
    if (val === null) {
      throw new Error("Can't convert missing value `NA` to a JS number");
    }
    return val;
  }

  toTypedArray(): Uint8Array {
    return new Uint8Array(
      Module.HEAPU8.subarray(Module._RAW(this.ptr), Module._RAW(this.ptr) + this.length)
    );
  }
}

/*
 * Convert the various types possible in the type union WebRData into
 * consistently typed arrays of names and values.
 */
function toWebRData<T>(jsObj: WebRDataAtomic<T>): {
  names: (string | null)[] | null;
  values: (T | null)[];
};
function toWebRData(jsObj: WebRData): WebRData;
function toWebRData(jsObj: WebRData): WebRData {
  if (isWebRDataTree(jsObj)) {
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

export function getRWorkerClass(type: RTypeNumber): typeof RObject {
  const typeClasses: { [key: number]: typeof RObject } = {
    [RTypeMap.null]: RNull,
    [RTypeMap.symbol]: RSymbol,
    [RTypeMap.pairlist]: RPairlist,
    [RTypeMap.closure]: RFunction,
    [RTypeMap.environment]: REnvironment,
    [RTypeMap.call]: RPairlist,
    [RTypeMap.special]: RFunction,
    [RTypeMap.builtin]: RFunction,
    [RTypeMap.string]: RString,
    [RTypeMap.logical]: RLogical,
    [RTypeMap.integer]: RInteger,
    [RTypeMap.double]: RDouble,
    [RTypeMap.complex]: RComplex,
    [RTypeMap.character]: RCharacter,
    [RTypeMap.list]: RList,
    [RTypeMap.raw]: RRaw,
    [RTypeMap.function]: RFunction,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  return RObject;
}

/**
 * Test for an RWorker.RObject instance.
 *
 * RWorker.RObject is the internal interface to R objects, intended to be used
 * on the worker thread.
 *
 * @private
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RObject.
 */
export function isRObject(value: any): value is RObject {
  return value && typeof value === 'object' && 'type' in value && 'toJs' in value;
}
