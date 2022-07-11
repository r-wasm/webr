import type { Module } from './utils';

declare let Module: Module;

enum SEXPTYPE {
  NILSXP = 0,
  SYMSXP,
  LISTSXP,
  CLOSXP,
  ENVSXP,
  PROMSXP,
  LANGSXP,
  SPECIALSXP,
  BUILTINSXP,
  CHARSXP,
  LGLSXP,
  INTSXP = 13,
  REALSXP,
  CPLXSXP,
  STRSXP,
  DOTSXP,
  ANYSXP,
  VECSXP,
  EXPRSXP,
  BCODESXP,
  EXTPTRSXP,
  WEAKREFSXP,
  RAWSXP,
  S4SXP,
}

type Complex = {
  re: number;
  im: number;
};

export type ImplicitTypes =
  | number
  | string
  | boolean
  | undefined
  | Date
  | Number
  | Boolean
  | String
  | Complex
  | ArrayBuffer
  | ArrayBufferView
  | Array<ImplicitTypes>
  | Map<ImplicitTypes, ImplicitTypes>
  | Set<ImplicitTypes>;

export class RProxy {
  ptr: number;
  constructor(ptr: number) {
    this.ptr = ptr;
  }
  get [Symbol.toStringTag](): string {
    return 'RProxy';
  }
  get type(): string {
    return SEXPTYPE[Module._TYPEOF(this.ptr)];
  }
  get convertImplicitly(): boolean {
    return false;
  }
  toJs(): ImplicitTypes {
    throw new TypeError('JS conversion for this R object is not supported.');
  }
}

class RProxyNil extends RProxy {
  toJs(): ImplicitTypes {
    return undefined;
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RProxyVector extends RProxy {
  get length(): number {
    return Module._LENGTH(this.ptr);
  }
}

class RProxyInt extends RProxyVector {
  toJs(): number | ArrayBufferView {
    if (this.length === 1) {
      return getValue(Module._INTEGER(this.ptr), 'i32');
    } else {
      const arrView = Module.HEAP32.subarray(
        Module._INTEGER(this.ptr) / 4,
        Module._INTEGER(this.ptr) / 4 + this.length
      );
      return arrView;
    }
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RProxyReal extends RProxyVector {
  toJs(): number | ArrayBufferView {
    if (this.length === 1) {
      return getValue(Module._REAL(this.ptr), 'double');
    } else {
      const arrView = Module.HEAPF64.subarray(
        Module._REAL(this.ptr) / 8,
        Module._REAL(this.ptr) / 8 + this.length
      );
      return arrView;
    }
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RProxyComplex extends RProxyVector {
  toJs(): Complex | Array<Complex> {
    if (this.length === 1) {
      return {
        re: getValue(Module._COMPLEX(this.ptr), 'double'),
        im: getValue(Module._COMPLEX(this.ptr) + 8, 'double'),
      };
    } else {
      return Array.from({ length: this.length }, (_, idx) => {
        return {
          re: getValue(Module._COMPLEX(this.ptr) + 8 * (idx * 2), 'double'),
          im: getValue(Module._COMPLEX(this.ptr) + 8 * (idx * 2 + 1), 'double'),
        };
      });
    }
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RProxyStr extends RProxyVector {
  toJs(): string | Array<string> {
    if (this.length === 1) {
      // eslint-disable-next-line new-cap
      return UTF8ToString(Module._R_CHAR(Module._STRING_ELT(this.ptr, 0)));
    } else {
      return Array.from({ length: this.length }, (_, idx) => {
        // eslint-disable-next-line new-cap
        return UTF8ToString(Module._R_CHAR(Module._STRING_ELT(this.ptr, idx)));
      });
    }
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

class RProxyRaw extends RProxyVector {
  toJs(): Uint8Array {
    const arrView = Module.HEAPU8.subarray(
      Module._RAW(this.ptr),
      Module._RAW(this.ptr) + this.length
    );
    return arrView;
  }
  get convertImplicitly(): boolean {
    return true;
  }
}

function getRProxyClass(type: SEXPTYPE): typeof RProxy {
  const typeClasses: { [key: number]: typeof RProxy } = {
    [SEXPTYPE.NILSXP]: RProxyNil,
    [SEXPTYPE.INTSXP]: RProxyInt,
    [SEXPTYPE.REALSXP]: RProxyReal,
    [SEXPTYPE.CPLXSXP]: RProxyComplex,
    [SEXPTYPE.STRSXP]: RProxyStr,
    [SEXPTYPE.RAWSXP]: RProxyRaw,
  };
  if (type in typeClasses) {
    return typeClasses[type];
  }
  throw new TypeError(`RProxy SEXP type ${SEXPTYPE[type]} has not yet been implemented.`);
}

const SEXPProxyHandlers = {
  get(target: RProxy, prop: string): any {
    if (prop in target) {
      return Reflect.get(target, prop);
    }
  },
};

export function convertSEXP(ptr: number): ImplicitTypes | RProxy {
  const type = Module._TYPEOF(ptr);
  const proxyTarget: RProxy = new (getRProxyClass(type))(ptr);
  const proxy = new Proxy(proxyTarget, SEXPProxyHandlers);
  if (proxy.convertImplicitly) {
    return proxy.toJs();
  } else {
    return proxy;
  }
}
