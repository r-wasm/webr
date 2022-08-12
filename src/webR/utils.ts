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
