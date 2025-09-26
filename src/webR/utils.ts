import { IN_NODE } from './compat';
import { WebRError } from './error';
import { isComplex, isWebRDataJs } from './robj';
import { RObjectBase } from './robj-worker';

export type PromiseHandles<T = void> = {
    resolve: ResolveFn<T>;
    reject: RejectFn;
    promise: Promise<T>;
};
export type ResolveFn<T = unknown> = (value: T | PromiseLike<T>) => void;
export type RejectFn = (_reason?: any) => void;

export function promiseHandles<T = void>(): PromiseHandles<T> {
  const out = {
    resolve: (() => { return; }) as ResolveFn<T>,
    reject: (() => { return; }) as RejectFn,
    promise: Promise.resolve() as Promise<T>,
  };

  const promise = new Promise<T>((resolve, reject) => {
    out.resolve = resolve;
    out.reject = reject;
  });
  out.promise = promise;

  return out;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function replaceInObject<T>(
  obj: T | T[],
  test: (obj: any) => boolean,
  replacer: (obj: any, ...replacerArgs: any[]) => unknown,
  ...replacerArgs: unknown[]
): T | T[] {
  if (obj === null || obj === undefined || isImageBitmap(obj)) {
    return obj;
  }
  if (obj instanceof ArrayBuffer) {
    return new Uint8Array(obj) as T;
  }
  if (test(obj)) {
    return replacer(obj, ...replacerArgs) as T;
  }
  if (Array.isArray(obj) || ArrayBuffer.isView(obj)) {
    return (obj as unknown[]).map((v) =>
      replaceInObject(v, test, replacer, ...replacerArgs)
    ) as T[];
  }
  if (obj instanceof RObjectBase) {
    return obj;
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, replaceInObject(v, test, replacer, ...replacerArgs)])
    ) as T;
  }
  return obj;
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
export function newCrossOriginWorker(
  url: string,
  cb: (worker: Worker) => void,
  onError?: (error: Error) => void,
  options?: WorkerOptions,
  async = true,
): void {
  const req = new XMLHttpRequest();
  req.open('get', url, async);
  req.onload = () => {
    if (req.status >= 200 && req.status < 300) {
      try {
        const worker = new Worker(URL.createObjectURL(new Blob([req.responseText])), options);
        cb(worker);
      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        } else {
          throw error;
        }
      }
    } else {
      if (onError) {
        onError(new Error(`Worker loading error: HTTP ${req.status}`));
      } else {
        console.error(`HTTP Error: ${req.status}`);
      }
    }
  };

  req.onerror = () => {
    if (onError) {
      onError(new Error(`Network error loading ${url}`));
    } else {
      console.error(`Network error loading ${url}`);
    }
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

export function isImageBitmap(value: any): value is ImageBitmap {
  return (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap);
}

export function throwUnreachable(context?: string) {
  let msg = 'Reached the unreachable';
  msg = msg + (context ? ': ' + context : '.');

  throw new WebRError(msg);
}

export function isSimpleObject(value: any): value is {[key: string | number | symbol]: any} {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(ArrayBuffer.isView(value)) &&
    !isComplex(value) &&
    !isWebRDataJs(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp) &&
    !(value instanceof Error) &&
    !(value instanceof RObjectBase) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

// From https://stackoverflow.com/a/9458996
export function bufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// From https://stackoverflow.com/a/21797381
export function base64ToBuffer(base64: string) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
