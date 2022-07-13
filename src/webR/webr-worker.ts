import { BASE_URL, PKG_BASE_URL } from './config';
import { loadScript } from './compat';
import { ChannelWorker } from './chan/channel';
import { Message, Request, newResponse } from './chan/message';
import { RawTypes, RSexp, wrapRSexp, RSexpObj } from './sexp';
import { FSNode, WebROptions, Module, XHRResponse } from './utils';

let initialised = false;

self.onmessage = function (ev: MessageEvent) {
  if (!ev || !ev.data || !ev.data.type || ev.data.type !== 'init') {
    return;
  }
  if (initialised) {
    throw new Error("Can't initialise worker multiple times.");
  }

  init(ev.data as WebROptions);
  initialised = true;
};

const defaultEnv = {
  R_HOME: '/usr/lib/R',
  R_ENABLE_JIT: '0',
};

const defaultOptions = {
  RArgs: [],
  REnv: defaultEnv,
  WEBR_URL: BASE_URL,
  PKG_URL: PKG_BASE_URL,
  homedir: '/home/web_user',
};

const Module = {} as Module;
let _config: Required<WebROptions>;

function inputOrDispatch(chan: ChannelWorker): string {
  for (;;) {
    // This blocks the thread until a response
    const msg: Message = chan.read();

    switch (msg.type) {
      case 'stdin':
        return msg.data as string;

      case 'request': {
        const req = msg as Request;
        const reqMsg = req.data.msg;

        const write = (resp: any, transferables?: [Transferable]) =>
          chan.write(newResponse(req.data.uuid, resp, transferables));
        switch (reqMsg.type) {
          case 'putFileData': {
            // FIXME: Use a replacer + reviver to transfer Uint8Array
            const data = Uint8Array.from(Object.values(reqMsg.data.data as ArrayLike<number>));
            write(putFileData(reqMsg.data.name as string, data));
            continue;
          }
          case 'getFileData': {
            const out = getFileData(reqMsg.data.name as string);
            write(out, [out.buffer]);
            continue;
          }
          case 'getFSNode':
            write(getFSNode(reqMsg.data.path as string));
            continue;
          case 'getRSexp': {
            const data = reqMsg.data as {
              rObj: RSexpObj;
              path: string[];
              args: RawTypes[] | undefined;
            };
            write(getRSexp(data.rObj, data.path, data.args));
            continue;
          }
          default:
            throw new Error('Unknown event `' + reqMsg.type + '`');
        }
      }

      default:
        throw new Error('Unknown event `' + msg.type + '`');
    }
  }
}

function isRSexp(value: any): value is RSexp {
  return typeof value === 'object' && 'convertImplicitly' in value && 'type' in value;
}

/**
 * Get a RSexp object, optionally evaluating and/or calling the object where required
 * Returns a RSexpObj containing either a reference to the SEXP object in WASM memory
 * or the object repressented in an equivalent JS form.
 *
 * @param {RSexpObj}  target - A reference to the R SEXP object, or raw R code
 * @param {string[]} [path] - A list of properties to iteratively navigate
 * @param {RawTypes[]} [args] - A list of arguments to call the resulting object with
 * @return {RSexpObj} The resulting SEXP object, either as a reference or raw JS
 */
function getRSexp(target: RSexpObj, path: string[], args?: RawTypes[]): RSexpObj {
  let ret: RSexpObj = { obj: undefined, raw: true };
  let root: RSexp;
  try {
    // If the original target was a raw R code string, evaluate it first
    if (target.raw === true && typeof target.obj === 'string') {
      root = evalRCode(target.obj);
    } else if (target.raw === false) {
      root = wrapRSexp(target.obj);
    } else {
      throw new Error('Proxy target object must be RPtr or code string');
    }

    // Navigate the property array and grab the required RSexp objects
    // @ts-expect-error ts(7053)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    let res = path.reduce((obj, prop) => obj[prop], root) as RawTypes | RSexp | Function;
    // @ts-expect-error ts(7053)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], root) as RawTypes | RSexp;

    // If requested, call the resulting object with the provided arguments
    if (typeof res === 'function' && args) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      res = res.apply(parent, args);
    } else if (isRSexp(res) && args) {
      res = res._call.call(parent, args);
    }

    // Return a reference to the result object back to the main thread,
    // converting to JS implicitly where requested
    if (isRSexp(res) && res.convertImplicitly) {
      ret = { obj: res.toJs(), raw: true };
    } else if (isRSexp(res)) {
      ret = { obj: res.ptr, raw: false };
    } else if (!(typeof res === 'function')) {
      ret = { obj: res, raw: true };
    } else {
      throw Error('Returned property cannot be transferred to main thread');
    }
  } catch (e) {
    // Report the worker error back to the main thread
    if (e instanceof Error) {
      ret = { obj: e, raw: true };
    }
  }
  return ret;
}

function evalRCode(code: string): RSexp {
  const str = allocateUTF8(code);
  const err = allocate(1, 'i32', 0);
  const resultPtr = Module._evalRCode(str, err);
  const errValue = getValue(err, 'i32');
  if (errValue) {
    throw Error(`An error occured evaluating R code (${errValue})`);
  }
  Module._free(str);
  Module._free(err);
  return wrapRSexp(resultPtr);
}

function getFSNode(path: string): FSNode {
  const node = FS.lookupPath(path, {}).node;
  return copyFSNode(node as FSNode);
}

function copyFSNode(obj: FSNode): FSNode {
  const retObj = {
    id: obj.id,
    name: obj.name,
    mode: obj.mode,
    isFolder: obj.isFolder,
    contents: {},
  };
  if (obj.isFolder) {
    retObj.contents = Object.entries(obj.contents).map(([, node]) => copyFSNode(node));
  }
  return retObj;
}

function downloadFileContent(URL: string, headers: Array<string> = []): XHRResponse {
  const request = new XMLHttpRequest();
  request.open('GET', URL, false);
  request.responseType = 'arraybuffer';

  try {
    headers.forEach((header) => {
      const splitHeader = header.split(': ');
      request.setRequestHeader(splitHeader[0], splitHeader[1]);
    });
  } catch {
    const responseText = 'An error occured setting headers in XMLHttpRequest';
    console.error(responseText);
    return { status: 400, response: responseText };
  }

  try {
    request.send(null);
    if (request.status >= 200 && request.status < 300) {
      return { status: request.status, response: request.response as ArrayBuffer };
    } else {
      const responseText = new TextDecoder().decode(request.response as ArrayBuffer);
      console.error(`Error fetching ${URL} - ${responseText}`);
      return { status: request.status, response: responseText };
    }
  } catch {
    return { status: 400, response: 'An error occured in XMLHttpRequest' };
  }
}

function getFileData(name: string): Uint8Array {
  const size = FS.stat(name).size as number;
  const stream = FS.open(name, 'r');
  const buf = new Uint8Array(size);
  FS.read(stream, buf, 0, size, 0);
  FS.close(stream);
  return buf;
}

function putFileData(name: string, data: Uint8Array) {
  FS.createDataFile('/', name, data, true, true, true);
}

function init(options: WebROptions = {}) {
  _config = Object.assign(defaultOptions, options);

  Module.preRun = [];
  Module.arguments = _config.RArgs;
  Module.noExitRuntime = true;
  Module.noImageDecoding = true;
  Module.noAudioDecoding = true;

  Module.preRun.push(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: next-line
    FS.mkdirTree(_config.homedir);
    FS.chdir(_config.homedir);
    Module.ENV.HOME = _config.homedir;
    Module.ENV = Object.assign(Module.ENV, _config.REnv);
  });

  const chan = new ChannelWorker();

  Module.webr = {
    resolveInit: () => {
      chan.resolve();
    },

    // C code must call `free()` on the result
    readConsole: () => {
      const input = inputOrDispatch(chan);
      return allocateUTF8(input);
    },
  };

  Module.locateFile = (path: string) => _config.WEBR_URL + path;
  Module.downloadFileContent = downloadFileContent;

  Module.print = (text: string) => {
    chan.write({ type: 'stdout', data: text });
  };
  Module.printErr = (text: string) => {
    chan.write({ type: 'stderr', data: text });
  };
  Module.setPrompt = (prompt: string) => {
    chan.write({ type: 'prompt', data: prompt });
  };
  Module.canvasExec = (op: string) => {
    chan.write({ type: 'canvasExec', data: op });
  };

  (globalThis as any).Module = Module;

  // At the next tick, launch the REPL. This never returns.
  setTimeout(() => {
    const scriptSrc = `${_config.WEBR_URL}R.bin.js`;
    loadScript(scriptSrc);
  });
}
