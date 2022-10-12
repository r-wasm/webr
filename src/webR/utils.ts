import { RawType } from './robj';

export type ResolveFn = (_value?: unknown) => void;
export type RejectFn = (_reason?: any) => void;

export function promiseHandles() {
  const out = {
    resolve: (_value?: unknown) => {},
    reject: (_reason?: any) => {},
    promise: null as unknown as Promise<unknown>,
  };

  const promise = new Promise((resolve, reject) => {
    out.resolve = resolve;
    out.reject = reject;
  });
  out.promise = promise;

  return out;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function unpackScalarArrays(obj: RawType): RawType {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 1) {
      return unpackScalarArrays(obj[0]);
    } else {
      return obj.map((v: RawType) => unpackScalarArrays(v));
    }
  }
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]: [string, RawType]) => [k, unpackScalarArrays(v)])
  );
}
