import { RawType, NamedArrays, NamedObject } from './robj';

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

export function unpackScalarVectors(obj: RawType): RawType {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if ('values' in obj && Array.isArray(obj.values)) {
    if (obj.values.length === 1) {
      obj = unpackScalarVectors(obj.values[0]);
    } else {
      obj.values = obj.values.map((v: RawType) => unpackScalarVectors(v));
    }
    return obj;
  }
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]: [string, RawType]) => [k, unpackScalarVectors(v)])
  );
}

export function mergeListArrays(obj: NamedArrays<RawType[]>): NamedObject<RawType> {
  const names = obj.names as string[];
  if (!names || names.some((name) => typeof name === 'undefined')) {
    throw new Error('Attempted to merge unnamed list array');
  }
  return obj.values
    .map((v, idx) => {
      return { [names[idx]]: v };
    })
    .reduce((prev, cur) => Object.assign(prev, cur), {});
}
