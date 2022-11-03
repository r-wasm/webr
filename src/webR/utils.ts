import { IN_NODE } from './compat';
import { RawType, RObjectTree, NamedObject } from './robj';

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

export function mergeListArrays(obj: RObjectTree<RawType[]>): NamedObject<RawType> {
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

/* Workaround for loading a cross-origin script.
 *
 * When fetching a worker script, the fetch is required by the spec to
 * use "same-origin" mode. This is to avoid loading a worker with a
 * cross-origin global scope, which can allow for a cross-origin
 * restriction bypass.
 *
 * When the fetch URL begins with 'http', we assume the request is
 * cross-origin. We download the content of the URL using a XHR first,
 * create a blob URL containing the requested content, then load the
 * blob URL as a script.
 *
 * The origin of a blob URL is the same as that of the environment that
 * created the URL, and so the global scope of the resulting worker is
 * no longer cross-origin. In that case, the cross-origin restriction
 * bypass is not possible, and the script is permitted to be loaded.
 */
export function newCrossOriginWorker(url: string, cb: (worker: Worker) => void): void {
  const req = new XMLHttpRequest();
  req.open('get', url, true);
  req.onload = () => {
    const worker = new Worker(URL.createObjectURL(new Blob([req.responseText])));
    cb(worker);
  };
  req.send();
}

export function isCrossOrigin(urlString: string) {
  if (IN_NODE) return false;
  const url1 = new URL(location.href);
  const url2 = new URL(urlString, location.origin);
  if (url1.host === url2.host && url1.port === url2.port && url1.protocol === url2.protocol) {
    return false;
  }
  return true;
}
