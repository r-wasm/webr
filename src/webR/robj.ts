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

  isNull(): this is RObjNull {
    return Module._TYPEOF(this.ptr) === RType.Null;
  }

  isUnbound(): boolean {
    return this.ptr === RObj.unboundValue.ptr;
  }

  attrs(): Nullable<RObjPairlist> {
    return RObj.wrap(Module._ATTRIB(this.ptr)) as RObjPairlist;
  }

  names(): Nullable<RObjList> {
    const attrs = this.attrs();
    if (attrs.isNull()) {
      return attrs;
    }
    return attrs.get('names') as Nullable<RObjList>;
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
}

export class RObjNull extends RObj {
  toJs(): null {
    return null;
  }
}

class RObjSymbol extends RObj {
  toJs(): RawType {
    return this.toObject();
  }
  toObject(): { printname: string; symvalue: RPtr | undefined; internal: RPtr | undefined } {
    return {
      printname: UTF8ToString(Module._R_CHAR(this.printname().ptr)),
      symvalue: this.symvalue().isUnbound() ? undefined : this.symvalue().ptr,
      internal: this.internal().isNull() ? undefined : this.internal().ptr,
    };
  }
  printname(): RObj {
    return RObj.wrap(Module._PRINTNAME(this.ptr));
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
      if (!symbol.isNull() && symbol.toObject().printname !== '') {
        d[symbol.toObject().printname] = next.car().toJs();
      } else {
        d[Object.keys(d).length] = next.car().toJs();
      }
    }
    return d;
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

  get(idx: number): RObj {
    return RObj.wrap(Module._VECTOR_ELT(this.ptr, idx));
  }

  toJs(): RawType[] {
    return this.toArray();
  }

  toArray(): RawType[] {
    return [...Array(this.length).keys()].map((i) => this.get(i).toJs());
  }
}

function getRObjClass(type: RType): typeof RObj {
  const typeClasses: { [key: number]: typeof RObj } = {
    [RType.Null]: RObjNull,
    [RType.Symbol]: RObjSymbol,
    [RType.Pairlist]: RObjPairlist,
    [RType.List]: RObjList,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  return RObj;
}
