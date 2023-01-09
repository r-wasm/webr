import { Module } from './emscripten';
import { WebRPayload, isWebRPayload, isWebRPayloadPtr, isWebRPayloadRaw } from './payload';
import { Complex, isComplex, NamedEntries, NamedObject, WebRDataRaw } from './robj';
import { WebRData, WebRDataAtomic, RPtr, RType, RTypeMap, RTypeNumber } from './robj';
import { parseEvalBare } from './utils-r';
import { isWebRDataTree, WebRDataTree, WebRDataTreeAtomic, WebRDataTreeNode } from './tree';
import { WebRDataTreeNull, WebRDataTreeString, WebRDataTreeSymbol } from './tree';

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

  // JS arrays are interpreted using R's c() function, so as to match
  // R's built in coercion rules
  if (Array.isArray(obj)) {
    const objs = obj.map((el) => newObjectFromData(el));
    const cString = Module.allocateUTF8('c');
    const call = RObject.protect(
      RObject.wrap(Module._Rf_allocVector(RTypeMap.call, objs.length + 1)) as RPairlist
    );
    call.setcar(RObject.wrap(Module._Rf_install(cString)));
    let next = call.cdr();
    let i = 0;
    while (!next.isNull()) {
      next.setcar(objs[i++]);
      next = next.cdr();
    }
    const res = RObject.wrap(Module._Rf_eval(call.ptr, RObject.baseEnv.ptr));
    RObject.unprotect(1);
    Module._free(cString);
    return res;
  }

  throw new Error('Robj construction for this JS object is not yet supported');
}

export class RObject {
  ptr: RPtr;

  constructor(data: WebRPayload | WebRData) {
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
    return RObject.wrap(Module._ATTRIB(this.ptr)) as RPairlist;
  }

  setNames(values: (string | null)[] | null): this {
    let namesObj: RObject;
    if (values === null) {
      namesObj = RObject.null;
      RObject.protect(namesObj);
    } else if (Array.isArray(values) && values.every((v) => typeof v === 'string' || v === null)) {
      namesObj = new RCharacter(values);
    } else {
      throw new Error('Argument to setNames must be null or an Array of strings or null');
    }
    Module._Rf_setAttrib(this.ptr, RObject.namesSymbol.ptr, namesObj.ptr);
    RObject.unprotect(1);
    return this;
  }

  names(): (string | null)[] | null {
    const names = RObject.wrap(
      Module._Rf_protect(Module._Rf_getAttrib(this.ptr, RObject.namesSymbol.ptr))
    ) as RCharacter;
    if (names.isNull()) {
      return null;
    }
    return names.toArray();
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
    let idx: RPtr;
    let char: RPtr = 0;
    if (typeof prop === 'number') {
      idx = Module._Rf_protect(Module._Rf_ScalarInteger(prop));
    } else {
      char = Module.allocateUTF8(prop);
      idx = Module._Rf_protect(Module._Rf_mkString(char));
    }
    const call = Module._Rf_protect(Module._Rf_lang3(RObject.bracketSymbol.ptr, this.ptr, idx));
    const sub = RObject.wrap(Module._Rf_eval(call, RObject.baseEnv.ptr));
    Module._Rf_unprotect(2);
    if (char) Module._free(char);
    return sub;
  }

  get(prop: number | string): RObject {
    let idx: RPtr;
    let char: RPtr = 0;
    if (typeof prop === 'number') {
      idx = Module._Rf_protect(Module._Rf_ScalarInteger(prop));
    } else {
      char = Module.allocateUTF8(prop);
      idx = Module._Rf_protect(Module._Rf_mkString(char));
    }
    const call = Module._Rf_protect(Module._Rf_lang3(RObject.bracket2Symbol.ptr, this.ptr, idx));
    const sub = RObject.wrap(Module._Rf_eval(call, RObject.baseEnv.ptr));
    Module._Rf_unprotect(2);
    if (char) Module._free(char);
    return sub;
  }

  getDollar(prop: string): RObject {
    const char = Module.allocateUTF8(prop);
    const idx = Module._Rf_protect(Module._Rf_mkString(char));
    const call = Module._Rf_protect(Module._Rf_lang3(RObject.dollarSymbol.ptr, this.ptr, idx));
    const sub = RObject.wrap(Module._Rf_eval(call, RObject.baseEnv.ptr));
    Module._Rf_unprotect(2);
    Module._free(char);
    return sub;
  }

  pluck(...path: (string | number)[]): RObject | undefined {
    try {
      const result = path.reduce(
        (obj: RObject, prop: string | number): RObject => obj.get(prop),
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

  set(prop: string | number, value: RObject | WebRDataRaw) {
    let idx: RPtr;
    let char: RPtr = 0;
    if (typeof prop === 'number') {
      idx = Module._Rf_protect(Module._Rf_ScalarInteger(prop));
    } else {
      char = Module.allocateUTF8(prop);
      idx = Module._Rf_protect(Module._Rf_mkString(char));
    }

    const valueObj = isRObject(value) ? value : new RObject({ obj: value, payloadType: 'raw' });

    const assign = Module.allocateUTF8('[[<-');
    const call = Module._Rf_protect(
      Module._Rf_lang4(Module._Rf_install(assign), this.ptr, idx, valueObj.ptr)
    );
    const val = RObject.wrap(Module._Rf_eval(call, RObject.baseEnv.ptr));

    Module._Rf_unprotect(2);
    if (char) Module._free(char);
    Module._free(assign);

    if (!isRObject(value)) {
      valueObj.release();
    }

    return val;
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
    return RObject.wrap(Module.getValue(Module._R_NilValue, '*')) as RNull;
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
    return RObject.wrap(Module.getValue(Module._R_TrueValue, '*')) as RLogical;
  }

  static get false(): RLogical {
    return RObject.wrap(Module.getValue(Module._R_FalseValue, '*')) as RLogical;
  }

  static get logicalNA(): RLogical {
    return RObject.wrap(Module.getValue(Module._R_LogicalNAValue, '*')) as RLogical;
  }

  static get unboundValue(): RObject {
    return RObject.wrap(Module.getValue(Module._R_UnboundValue, '*'));
  }

  static get bracketSymbol(): RSymbol {
    return RObject.wrap(Module.getValue(Module._R_BracketSymbol, '*')) as RSymbol;
  }

  static get bracket2Symbol(): RSymbol {
    return RObject.wrap(Module.getValue(Module._R_Bracket2Symbol, '*')) as RSymbol;
  }

  static get dollarSymbol(): RSymbol {
    return RObject.wrap(Module.getValue(Module._R_DollarSymbol, '*')) as RSymbol;
  }

  static get namesSymbol(): RSymbol {
    return RObject.wrap(Module.getValue(Module._R_NamesSymbol, '*')) as RSymbol;
  }

  static wrap(ptr: RPtr): RObject {
    const type = Module._TYPEOF(ptr);
    return new (getRWorkerClass(type as RTypeNumber))({ payloadType: 'ptr', obj: { ptr } });
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

  printname(): RString {
    return RObject.wrap(Module._PRINTNAME(this.ptr)) as RString;
  }
  symvalue(): RObject {
    return RObject.wrap(Module._SYMVALUE(this.ptr));
  }
  internal(): RObject {
    return RObject.wrap(Module._INTERNAL(this.ptr));
  }

  // FIXME: Should this be a ctor?
  static install(x: string): RSymbol {
    const name = Module.allocateUTF8(x);
    try {
      return RObject.wrap(Module._Rf_install(name)) as RSymbol;
    } finally {
      Module._free(name);
    }
  }
}

export class RPairlist extends RObject {
  constructor(val: WebRPayload | WebRData) {
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }

    const { names, values } = toWebRData(val);
    const list = RObject.wrap(Module._Rf_allocList(values.length)) as RPairlist;
    list.protect();

    try {
      for (
        let [i, next] = [0, list as Nullable<RPairlist>];
        !next.isNull();
        [i, next] = [i + 1, next.cdr()]
      ) {
        next.setcar(new RObject(values[i]));
      }

      list.setNames(names);
      super({ payloadType: 'ptr', obj: { ptr: list.ptr } });
    } finally {
      RObject.unprotect(1);
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
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }

    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_allocVector(RTypeMap.list, values.length);
    Module._Rf_protect(ptr);

    try {
      values.forEach((v, i) => {
        Module._SET_VECTOR_ELT(ptr, i, new RObject(v).ptr);
      });
      RObject.wrap(ptr).setNames(names);

      super({ payloadType: 'ptr', obj: { ptr } });
    } finally {
      Module._Rf_unprotect(1);
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
    const argObjs = args.map((arg) =>
      isRObject(arg) ? arg : new RObject({ obj: arg, payloadType: 'raw' })
    );
    const call = RObject.protect(
      RObject.wrap(Module._Rf_allocVector(RTypeMap.call, args.length + 1)) as RPairlist
    );
    call.setcar(this);
    let c = call.cdr();
    let i = 0;
    while (!c.isNull()) {
      c.setcar(argObjs[i++]);
      c = c.cdr();
    }
    const res = RObject.wrap(Module._Rf_eval(call.ptr, RObject.baseEnv.ptr));
    RObject.unprotect(1);

    argObjs.forEach((argObj, idx) => {
      if (!isRObject(args[idx])) {
        argObj.release();
      }
    });

    return res;
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
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }

    const { names, values } = toWebRData(val);
    const ptr = Module._R_NewEnv(RObject.globalEnv.ptr, 0, 0);
    Module._Rf_protect(ptr);

    try {
      values.forEach((v, i) => {
        const name = names ? names[i] : null;
        if (!name) {
          throw new Error("Can't create object in new environment with empty symbol name");
        }
        Module._Rf_defineVar(RSymbol.install(name).ptr, new RObject(v).ptr, ptr);
      });

      super({ payloadType: 'ptr', obj: { ptr } });
    } finally {
      Module._Rf_unprotect(1);
    }
  }

  ls(all = false, sorted = true): string[] {
    const ls = RObject.wrap(
      Module._R_lsInternal3(this.ptr, Number(all), Number(sorted))
    ) as RCharacter;
    return ls.toArray() as string[];
  }

  bind(name: string, value: RObject | WebRDataRaw): void {
    const namePtr = Module.allocateUTF8(name);
    Module._Rf_defineVar(
      Module._Rf_install(namePtr),
      isRObject(value) ? value.ptr : new RObject({ payloadType: 'raw', obj: value }).ptr,
      this.ptr
    );
    Module._free(namePtr);
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
    const isna = Module.allocateUTF8('is.na');
    const call = Module._Rf_protect(Module._Rf_lang2(Module._Rf_install(isna), this.ptr));
    const val = RObject.wrap(
      Module._Rf_protect(Module._Rf_eval(call, RObject.baseEnv.ptr))
    ) as RLogical;
    const ret = val.toTypedArray();
    RObject.unprotect(2);
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
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }

    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_allocVector(RTypeMap.logical, values.length);
    Module._Rf_protect(ptr);

    try {
      const data = Module._LOGICAL(ptr);
      values.forEach((v, i) =>
        Module.setValue(data + 4 * i, v === null ? RObject.naLogical : Boolean(v), 'i32')
      );

      RObject.wrap(ptr).setNames(names);
      super({ payloadType: 'ptr', obj: { ptr } });
    } finally {
      Module._Rf_unprotect(1);
    }
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
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }

    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_allocVector(RTypeMap.integer, values.length);
    Module._Rf_protect(ptr);

    try {
      const data = Module._INTEGER(ptr);

      values.forEach((v, i) =>
        Module.setValue(data + 4 * i, v === null ? RObject.naInteger : Math.round(Number(v)), 'i32')
      );
      RObject.wrap(ptr).setNames(names);

      super({ payloadType: 'ptr', obj: { ptr } });
    } finally {
      Module._Rf_unprotect(1);
    }
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
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }

    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_allocVector(RTypeMap.double, values.length);
    Module._Rf_protect(ptr);

    try {
      const data = Module._REAL(ptr);

      values.forEach((v, i) =>
        Module.setValue(data + 8 * i, v === null ? RObject.naDouble : v, 'double')
      );
      RObject.wrap(ptr).setNames(names);

      super({ payloadType: 'ptr', obj: { ptr } });
    } finally {
      Module._Rf_unprotect(1);
    }
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
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }

    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_allocVector(RTypeMap.complex, values.length);
    Module._Rf_protect(ptr);

    try {
      const data = Module._COMPLEX(ptr);

      values.forEach((v, i) =>
        Module.setValue(data + 8 * (2 * i), v === null ? RObject.naDouble : v.re, 'double')
      );
      values.forEach((v, i) =>
        Module.setValue(data + 8 * (2 * i + 1), v === null ? RObject.naDouble : v.im, 'double')
      );
      RObject.wrap(ptr).setNames(names);

      super({ payloadType: 'ptr', obj: { ptr } });
    } finally {
      Module._Rf_unprotect(1);
    }
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
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }

    const { names, values } = toWebRData(val);
    const ptr = Module._Rf_allocVector(RTypeMap.character, values.length);
    Module._Rf_protect(ptr);

    try {
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

      super({ payloadType: 'ptr', obj: { ptr } });
    } finally {
      Module._Rf_unprotect(1);
    }
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
    if (isWebRPayload(val)) {
      super(val);
      return this;
    }

    const { names, values } = toWebRData(val);
    if (values.some((v) => v === null || v > 255 || v < 0)) {
      throw new Error('Cannot create new RRaw object');
    }

    const ptr = Module._Rf_allocVector(RTypeMap.raw, values.length);
    Module._Rf_protect(ptr);

    try {
      const data = Module._RAW(ptr);

      values.forEach((v, i) => Module.setValue(data + i, Number(v), 'i8'));
      RObject.wrap(ptr).setNames(names);

      super({ payloadType: 'ptr', obj: { ptr } });
    } finally {
      Module._Rf_unprotect(1);
    }
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
