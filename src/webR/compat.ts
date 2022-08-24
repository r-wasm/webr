interface Process {
  browser: string | undefined;
  release: { [key: string]: string };
}
declare let process: Process;

export const IN_NODE =
  typeof process !== 'undefined' &&
  process.release &&
  process.release.name === 'node' &&
  typeof process.browser === 'undefined';

// Adapted from https://github.com/pyodide/pyodide/blob/main/src/js/compat.ts
export let loadScript: (url: string) => Promise<void>;
if (globalThis.document) {
  loadScript = (url) =>
    new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
} else if (globalThis.importScripts) {
  loadScript = async (url) => {
    try {
      if (url.startsWith('http')) {
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
        const req = new XMLHttpRequest();
        req.open('get', url, true);
        req.onload = function () {
          globalThis.importScripts(URL.createObjectURL(new Blob([req.responseText])));
        };
        req.send();
      } else {
        globalThis.importScripts(url);
      }
    } catch (e) {
      if (e instanceof TypeError) {
        await import(url);
      } else {
        throw e;
      }
    }
  };
} else if (IN_NODE) {
  loadScript = async (url: string) => {
    const nodePathMod = (await import('path')).default;
    await import(nodePathMod.resolve(url));
  };
} else {
  throw new Error('Cannot determine runtime environment');
}
