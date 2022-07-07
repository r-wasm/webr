export type ResolveFn = (_value?: unknown) => void;
export type RejectFn = (_reason?: any) => void;

export function promiseHandles() {
  let out = {
    resolve: (_value?: unknown) => { },
    reject: (_reason?: any) => { },
    promise: null as unknown as Promise<unknown>
  };

  let promise = new Promise((resolve, reject) => {
    out.resolve = resolve;
    out.reject = reject;
  });
  out.promise = promise;

  return out;
}


export type UUID = string;

export function newUUID(): UUID {
  return Array.from({ length: 4 }, UUIDSegment).join("-");
}
function UUIDSegment() {
  let out = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
  let pad = 15 - out.length;
  if (pad > 0) {
    out = Array.from({ length: pad }, (_) => 0).join("") + out;
  }
  return out;
}


export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
