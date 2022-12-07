import { loadScript } from './compat';
import { newChannelWorker, ChannelWorker, ChannelInitMessage } from './chan/channel';
import { Message, Request, newResponse } from './chan/message';
import { FSNode, WebROptions, EvalRCodeOptions } from './webr-main';
import { Module } from './module';
import { IN_NODE } from './compat';
import { replaceInObject } from './utils';
import { RPtr, isRObjImpl, RObjImpl, RTargetObj, RTargetPtr, RawType, RTargetRaw } from './robj';

let initialised = false;
let chan: ChannelWorker | undefined;

const onWorkerMessage = function (msg: Message) {
  if (!msg || !msg.type || msg.type !== 'init') {
    return;
  }
  if (initialised) {
    throw new Error("Can't initialise worker multiple times.");
  }
  const messageInit = msg as ChannelInitMessage;
  chan = newChannelWorker(messageInit);
  init(messageInit.data.config);
  initialised = true;
};

if (IN_NODE) {
  require('worker_threads').parentPort.on('message', onWorkerMessage);
  (globalThis as any).XMLHttpRequest = require('xmlhttprequest-ssl')
    .XMLHttpRequest as XMLHttpRequest;
} else {
  globalThis.onmessage = (ev: MessageEvent<Message>) => onWorkerMessage(ev.data);
}

type XHRResponse = {
  status: number;
  response: string | ArrayBuffer;
};

const Module = {} as Module;
let _config: Required<WebROptions>;

function dispatch(msg: Message): void {
  switch (msg.type) {
    case 'request': {
      const req = msg as Request;
      const reqMsg = req.data.msg;

      const write = (resp: any, transferables?: [Transferable]) =>
        chan?.write(newResponse(req.data.uuid, resp, transferables));
      switch (reqMsg.type) {
        case 'putFileData': {
          // FIXME: Use a replacer + reviver to transfer Uint8Array
          const data = Uint8Array.from(Object.values(reqMsg.data.data as ArrayLike<number>));
          write(putFileData(reqMsg.data.name as string, data));
          break;
        }
        case 'getFileData': {
          const out = getFileData(reqMsg.data.name as string);
          write(out, [out.buffer]);
          break;
        }
        case 'getFSNode':
          write(getFSNode(reqMsg.data.path as string));
          break;
        case 'evalRCode': {
          const data = reqMsg.data as {
            code: string;
            env?: RTargetPtr;
            options: EvalRCodeOptions;
          };
          try {
            write(evalRCode(data.code, data.env, data.options));
          } catch (_e) {
            const e = _e as Error;
            write({
              targetType: 'err',
              obj: { name: e.name, message: e.message, stack: e.stack },
            });
          }
          break;
        }
        case 'newRObject': {
          const data = reqMsg.data as RTargetRaw;
          try {
            const res = new RObjImpl(data);
            write({
              obj: {
                type: res.type(),
                ptr: res.ptr,
                methods: RObjImpl.getMethods(res),
              },
              targetType: 'ptr',
            });
          } catch (_e) {
            const e = _e as Error;
            write({
              targetType: 'err',
              obj: { name: e.name, message: e.message, stack: e.stack },
            });
          }
          break;
        }
        case 'callRObjMethod': {
          const data = reqMsg.data as {
            target: RTargetPtr;
            prop: string;
            args: RTargetObj[];
          };
          try {
            write(callRObjMethod(RObjImpl.wrap(data.target.obj.ptr), data.prop, data.args));
          } catch (_e) {
            const e = _e as Error;
            write({
              targetType: 'err',
              obj: { name: e.name, message: e.message, stack: e.stack },
            });
          }
          break;
        }
        case 'getRObjProperty': {
          const data = reqMsg.data as {
            target: RTargetPtr;
            prop: string;
          };
          try {
            write(getRObjProperty(RObjImpl.wrap(data.target.obj.ptr), data.prop));
          } catch (_e) {
            const e = _e as Error;
            write({
              targetType: 'err',
              obj: { name: e.name, message: e.message, stack: e.stack },
            });
          }
          break;
        }
        case 'installPackage':
          write(
            evalRCode(`webr::install("${reqMsg.data.name as string}", repos="${_config.PKG_URL}")`)
          );
          break;
        default:
          throw new Error('Unknown event `' + reqMsg.type + '`');
      }
      break;
    }
    default:
      throw new Error('Unknown event `' + msg.type + '`');
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
    const status = IN_NODE
      ? (JSON.parse(String(request.status)) as { data: { statusCode: number } }).data.statusCode
      : request.status;

    if (status >= 200 && status < 300) {
      return { status: status, response: request.response as ArrayBuffer };
    } else {
      const responseText = new TextDecoder().decode(request.response as ArrayBuffer);
      console.error(`Error fetching ${URL} - ${responseText}`);
      return { status: status, response: responseText };
    }
  } catch {
    return { status: 400, response: 'An error occured in XMLHttpRequest' };
  }
}

/**
 * For a given RObjImpl object, call the given method with arguments
 *
 * Returns a RTargetObj containing either a reference to the resulting SEXP
 * object in WASM memory, or the object represented in an equivalent raw
 * JS form.
 *
 * @param {RObjImpl}  obj The R RObj object
 * @param {string} [prop] RObj method to invoke
 * @param {RTargetObj[]} [args] List of arguments to call with
 * @return {RTargetObj} The resulting R object
 */
function callRObjMethod(obj: RObjImpl, prop: string, args: RTargetObj[]): RTargetObj {
  if (!(prop in obj)) {
    throw new ReferenceError(`${prop} is not defined`);
  }

  const fn = obj[prop as keyof typeof obj];
  if (typeof fn !== 'function') {
    throw Error('Requested property cannot be invoked');
  }

  const res = (fn as Function).apply(
    obj,
    Array.from({ length: args.length }, (_, idx) => {
      const arg = args[idx];
      return arg.targetType === 'ptr' ? RObjImpl.wrap(arg.obj.ptr) : arg.obj;
    })
  ) as RawType | RObjImpl;

  const ret = replaceInObject(res, isRObjImpl, (obj: RObjImpl) => {
    return {
      obj: { type: obj.type(), ptr: obj.ptr, methods: RObjImpl.getMethods(obj) },
      targetType: 'ptr',
    };
  }) as RawType;

  return { obj: ret, targetType: 'raw' };
}

/**
 * For a given RObjImpl object, get the value of the given property
 *
 * Returns a RTargetObj containing either a reference to the resulting SEXP
 * object in WASM memory, or the object represented in an equivalent raw
 * JS form.
 *
 * @param {RObjImpl}  obj The R RObj object
 * @param {string} [prop] RObj property to get
 * @return {RTargetObj} The resulting R object
 */
function getRObjProperty(obj: RObjImpl, prop: string): RTargetObj {
  if (!(prop in obj)) {
    throw new ReferenceError(`${prop} is not defined`);
  }
  const res = obj[prop as keyof typeof obj] as RawType | RObjImpl;
  if (isRObjImpl(res)) {
    return {
      obj: { type: res.type(), ptr: res.ptr, methods: RObjImpl.getMethods(res) },
      targetType: 'ptr',
    };
  } else {
    return { obj: res, targetType: 'raw' };
  }
}

/**
 * Evaluate the given R code
 *
 * Returns a RTargetObj containing a reference to the resulting SEXP object
 * in WASM memory.
 *
 * @param {string}  code The R code to evaluate.
 * @param {RPtr} [env] An RPtr to the environment to evaluate within.
 * @param {Object<string,any>} [options={}] Options for the execution environment.
 * @param {boolean} [options.captureStreams] Should the stdout and stderr
 * output streams be captured and returned?
 * @param {boolean} [options.captureConditions] Should conditions raised during
 * execution be captured and returned?
 * @param {boolean} [options.withAutoprint] Should the code automatically print
 * output as if it were written at an R console?
 * @param {boolean} [options.withHandlers] Should the code be executed using a
 * tryCatch with handlers in place.
 * @return {RTargetObj} An R object containing the result of the computation
 * along with any other objects captured during execution.
 */
function evalRCode(code: string, env?: RTargetPtr, options: EvalRCodeOptions = {}): RTargetObj {
  const _options: Required<EvalRCodeOptions> = Object.assign(
    {
      captureStreams: true,
      captureConditions: true,
      withAutoprint: false,
      withHandlers: true,
    },
    options
  );

  let envObj = RObjImpl.globalEnv;
  if (env) {
    envObj = RObjImpl.wrap(env.obj.ptr);
    if (envObj.type() !== 'environment') {
      throw new Error('Attempted to eval R code with an env argument with invalid SEXP type');
    }
  }

  const tPtr = Module.getValue(Module._R_TrueValue, '*');
  const fPtr = Module.getValue(Module._R_FalseValue, '*');
  const codeStr = Module.allocateUTF8(code);
  const evalStr = Module.allocateUTF8('webr:::evalRCode');
  const codeObj = new RObjImpl({ targetType: 'raw', obj: code });
  codeObj.preserve();
  const expr = Module._Rf_lang6(
    Module._R_ParseEvalString(evalStr, RObjImpl.baseEnv.ptr),
    codeObj.ptr,
    _options.captureConditions ? tPtr : fPtr,
    _options.captureStreams ? tPtr : fPtr,
    _options.withAutoprint ? tPtr : fPtr,
    _options.withHandlers ? tPtr : fPtr
  );
  const evalResult = RObjImpl.wrap(Module._Rf_eval(expr, envObj.ptr));
  codeObj.release();
  Module._free(codeStr);
  Module._free(evalStr);
  return {
    obj: { type: evalResult.type(), ptr: evalResult.ptr, methods: RObjImpl.getMethods(evalResult) },
    targetType: 'ptr',
  };
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

function init(config: Required<WebROptions>) {
  _config = config;

  Module.preRun = [];
  Module.arguments = _config.RArgs;
  Module.noExitRuntime = true;
  Module.noImageDecoding = true;
  Module.noAudioDecoding = true;
  Module.noInitialRun = true;

  Module.preRun.push(() => {
    if (IN_NODE) {
      globalThis.FS = Module.FS;
    }
    Module.FS.mkdirTree(_config.homedir);
    Module.ENV.HOME = _config.homedir;
    Module.FS.chdir(_config.homedir);
    Module.ENV = Object.assign(Module.ENV, _config.REnv);
  });

  chan?.setDispatchHandler(dispatch);

  Module.onRuntimeInitialized = () => {
    chan?.run(_config.RArgs);
  };

  Module.webr = {
    resolveInit: () => {
      chan?.setInterrupt(Module._Rf_onintr);
      Module.setValue(Module._R_Interactive, _config.interactive, '*');
      evalRCode(`options(webr_pkg_repos="${_config.PKG_URL}")`);
      chan?.resolve();
    },

    readConsole: () => {
      if (!chan) {
        throw new Error('Unable to read console input without a communication channel');
      }
      return chan.inputOrDispatch();
    },

    handleEvents: () => {
      chan?.handleInterrupt();
    },

    evalJs: (code: RPtr): number => {
      try {
        return eval(Module.UTF8ToString(code));
      } catch (e) {
        const stop = Module.allocateUTF8('stop');
        const msg = Module.allocateUTF8(
          `An error occured during JavaScript evaluation:\n  ${(e as { message: string }).message}`
        );
        const call = Module._Rf_lang2(Module._Rf_install(stop), Module._Rf_mkString(msg));
        Module._free(stop);
        Module._free(msg);
        Module._Rf_eval(call, RObjImpl.baseEnv.ptr);
      }
      return 0;
    },
  };

  Module.locateFile = (path: string) => _config.WEBR_URL + path;
  Module.downloadFileContent = downloadFileContent;

  Module.print = (text: string) => {
    chan?.write({ type: 'stdout', data: text });
  };
  Module.printErr = (text: string) => {
    chan?.write({ type: 'stderr', data: text });
  };
  Module.setPrompt = (prompt: string) => {
    chan?.write({ type: 'prompt', data: prompt });
  };
  Module.canvasExec = (op: string) => {
    chan?.write({ type: 'canvasExec', data: op });
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (globalThis as any).Module = Module;

  // At the next tick, launch the REPL. This never returns.
  setTimeout(() => {
    const scriptSrc = `${_config.WEBR_URL}R.bin.js`;
    loadScript(scriptSrc);
  });
}
