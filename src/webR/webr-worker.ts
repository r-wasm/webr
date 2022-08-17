import { BASE_URL, PKG_BASE_URL } from './config';
import { loadScript } from './compat';
import { ChannelWorker } from './chan/channel';
import { Message, Request, newResponse } from './chan/message';
import { FSNode, WebROptions } from './webr-main';
import { Module } from './module';
import {
  RObj,
  RPtr,
  RTargetObj,
  RTargetPtr,
  RTargetType,
  RType,
  isRObj,
  isRObjCallable,
  RawType,
} from './robj';

let initialised = false;

self.onmessage = function (ev: MessageEvent) {
  if (!ev || !ev.data || !ev.data.type || ev.data.type !== 'init') {
    return;
  }
  if (initialised) {
    throw new Error("Can't initialise worker multiple times.");
  }

  init(ev.data.data as WebROptions);
  initialised = true;
};

type XHRResponse = {
  status: number;
  response: string | ArrayBuffer;
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
          case 'evalRCode': {
            const data = reqMsg.data as {
              code: string;
              env: RPtr;
            };
            try {
              write(evalRCode(data.code, data.env));
            } catch (e) {
              write({ type: RTargetType.RAW, obj: e });
            }
            continue;
          }
          case 'getRObj': {
            const data = reqMsg.data as {
              target: RTargetPtr;
              path: string[];
            };
            try {
              write(getRObj(RObj.wrap(data.target.obj), data.path));
            } catch (e) {
              write({ type: RTargetType.RAW, obj: e });
            }
            continue;
          }
          case 'setRObj': {
            const data = reqMsg.data as {
              target: RTargetPtr;
              path: string[];
              value: RTargetObj;
            };
            try {
              write(setRObj(RObj.wrap(data.target.obj), data.path, data.value));
            } catch (e) {
              write({ type: RTargetType.RAW, obj: e });
            }
            continue;
          }
          case 'callRObj': {
            const data = reqMsg.data as {
              target: RTargetPtr;
              path: string[];
              args: RTargetObj[];
            };
            try {
              write(callRObj(RObj.wrap(data.target.obj), data.path, data.args));
            } catch (e) {
              write({ type: RTargetType.RAW, obj: e });
            }
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

function getProp(obj: unknown, prop: string): RawType | RObj | Function {
  if (!obj) {
    throw new TypeError('Cannot read properties of undefined');
  } else if (isRObj(obj) && !isNaN(Number(prop))) {
    return obj.get(Number(prop));
  } else if (isRObj(obj) && prop.startsWith('$')) {
    prop = prop.slice(1);
    return obj.getDollar(prop);
  } else if (typeof obj === 'object' && prop in obj) {
    return obj[prop as keyof typeof obj];
  } else if (isRObj(obj) && obj.includes(prop)) {
    return obj.get(prop);
  }
  return undefined;
}

/**
 * Given a root RObj object, return the result of walking the given path of
 * properties.
 *
 * Returns a RTargetObj containing either a reference to the resulting SEXP
 * object in WASM memory, or the object represented in an equivalent raw
 * JS form.
 *
 * @param {RObj}  root The root R RObj object
 * @param {string[]} [path] List of properties to iteratively navigate
 * @return {RTargetObj} The resulting R object
 */
function getRObj(root: RObj, path: string[]): RTargetObj {
  const res = path.reduce(getProp, root);
  if (isRObj(res)) {
    return { obj: res.ptr, type: RTargetType.PTR };
  } else if (!(typeof res === 'function')) {
    return { obj: res, type: RTargetType.RAW };
  }
  throw Error('Resulting object cannot be transferred to main thread');
}

/**
 * Given a root RObj object, walk the given path of properties and set
 * the value of the result, if possible.
 *
 * @param {RObj}  root The root R RObj object
 * @param {string[]} [path] List of properties to iteratively navigate
 * @param {RObj} [value] The R RObj object to set the value to
 * @return {RTargetObj} The resulting R object
 */
function setRObj(root: RObj, path: string[], value: RTargetObj): RTargetObj {
  const parent = path.slice(0, -1).reduce(getProp, root) as RObj;
  let idx: string | number = path[path.length - 1];
  if (idx.startsWith('$')) {
    idx = idx.slice(1);
  }
  if (!isNaN(Number(idx))) {
    idx = Number(idx);
  }
  const obj = value.type === RTargetType.PTR ? RObj.wrap(value.obj) : new RObj(value);
  return { obj: parent.set(idx, obj).ptr, type: RTargetType.PTR };
}

/**
 * Given a root RObj object, call the result of walking the given path of
 * properties.
 *
 * Returns a RTargetObj containing either a reference to the resulting SEXP
 * object in WASM memory, or the object represented in an equivalent raw
 * JS form.
 *
 * @param {RObj}  root The root R RObj object
 * @param {string[]} [path] List of properties to iteratively navigate
 * @param {RTargetObj[]} [args] List of arguments to call with
 * @return {RTargetObj} The resulting R object
 */
function callRObj(root: RObj, path: string[], args: RTargetObj[]): RTargetObj {
  let res = path.reduce(getProp, root);
  const parent = path.slice(0, -1).reduce(getProp, root) as RObj;

  if (typeof res === 'function') {
    res = res.apply(
      parent,
      Array.from({ length: args.length }, (_, idx) => {
        const arg = args[idx];
        return arg.type === RTargetType.PTR ? RObj.wrap(arg.obj) : arg.obj;
      })
    ) as RawType | RObj | Function;
  } else if (isRObjCallable(res)) {
    res = res._call.call(
      parent,
      Array.from({ length: args.length }, (_, idx) => {
        const arg = args[idx];
        return arg.type === RTargetType.PTR ? RObj.wrap(arg.obj) : new RObj(arg);
      })
    );
  } else {
    throw Error('Resulting object cannot be invoked');
  }

  if (isRObj(res)) {
    return { obj: res.ptr, type: RTargetType.PTR };
  } else if (!(typeof res === 'function')) {
    return { obj: res, type: RTargetType.RAW };
  }
  throw Error('Resulting object cannot be transferred to main thread');
}

/**
 * Evaluate the given R code, within the given environment if provided.
 *
 * Returns a RTargetObj containing either a reference to the resulting SEXP
 * object in WASM memory, or the object represented in an equivalent raw
 * JS form.
 *
 * @param {string}  code The R code to evaluate
 * @param {RPtr} env? An RPtr to the environment to evaluate within
 * @return {RTargetObj} The resulting R object
 */
function evalRCode(code: string, env?: RPtr): RTargetObj {
  const str = allocateUTF8(`{${code}}`);
  let envObj = RObj.globalEnv;
  if (env) {
    envObj = RObj.wrap(env);
    if (envObj.type !== RType.Environment) {
      throw new Error('Attempted to eval R code with an env argument with invalid SEXP type');
    }
  }

  const evalResult = RObj.wrap(Module._evalRCode(str, envObj.ptr));
  const result = evalResult.get(1);
  const error = evalResult.get(2);

  Module._free(str);
  if (!error.isNull()) {
    throw new Error(error.get(1).toJs()?.toString());
  }
  return { obj: result.ptr, type: RTargetType.PTR };
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
  Module.FS.createDataFile('/', name, data, true, true, true);
}

function init(options: WebROptions = {}) {
  _config = Object.assign(defaultOptions, options);

  Module.preRun = [];
  Module.arguments = _config.RArgs;
  Module.noExitRuntime = true;
  Module.noImageDecoding = true;
  Module.noAudioDecoding = true;

  Module.preRun.push(() => {
    Module.FS.mkdirTree(_config.homedir);
    Module.ENV.HOME = _config.homedir;
    Module.FS.chdir(_config.homedir);
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
      return Module.allocateUTF8(input);
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (globalThis as any).Module = Module;

  // At the next tick, launch the REPL. This never returns.
  setTimeout(() => {
    const scriptSrc = `${_config.WEBR_URL}R.bin.js`;
    loadScript(scriptSrc);
  });
}
