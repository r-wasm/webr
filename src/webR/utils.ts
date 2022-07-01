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
