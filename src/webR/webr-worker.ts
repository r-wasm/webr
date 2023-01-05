import { loadScript } from './compat';
import { newChannelWorker, ChannelWorker, ChannelInitMessage } from './chan/channel';
import { Message, Request, newResponse } from './chan/message';
import { FSNode, WebROptions, CaptureROptions } from './webr-main';
import { Module } from './module';
import { IN_NODE } from './compat';
import { replaceInObject, throwUnreachable } from './utils';
import {
  RPtr,
  RType,
  RTypeMap,
  isRObjImpl,
  isRTargetPtr,
  RObjImpl,
  RTargetObj,
  RTargetPtr,
  RawType,
  RTargetRaw,
  RObjList,
  getRObjClass,
} from './robj';

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
        case 'captureR': {
          const data = reqMsg.data as {
            code: string;
            env?: RTargetPtr;
            options: CaptureROptions;
          };
          try {
            const capture = captureR(data.code, data.env, data.options);
            write({
              obj: {
                type: capture.type(),
                ptr: capture.ptr,
                methods: RObjImpl.getMethods(capture),
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
        case 'evalR': {
          const data = reqMsg.data as {
            code: string;
            env?: RTargetPtr;
          };
          try {
            const result = evalR(data.code, data.env);
            write({
              obj: {
                type: result.type(),
                ptr: result.ptr,
                methods: RObjImpl.getMethods(result),
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
        case 'newRObject': {
          const data = reqMsg.data as {
            obj: RTargetRaw;
            objType: RType | 'object';
          };
          try {
            write(newRObject(data.obj, data.objType));
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
            target?: RTargetPtr;
            prop: string;
            args: RTargetObj[];
          };
          const obj = data.target ? RObjImpl.wrap(data.target.obj.ptr) : RObjImpl;
          try {
            write(callRObjMethod(obj, data.prop, data.args));
          } catch (_e) {
            const e = _e as Error;
            write({
              targetType: 'err',
              obj: { name: e.name, message: e.message, stack: e.stack },
            });
          }
          break;
        }
        case 'installPackage': {
          const res = evalR(
            `webr::install("${reqMsg.data.name as string}", repos="${_config.PKG_URL}")`
          );
          write({
            obj: {
              type: res.type(),
              ptr: res.ptr,
              methods: RObjImpl.getMethods(res),
            },
            targetType: 'ptr',
          });
          break;
        }
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
 * Construct a new R object from a given JavaScript object.
 *
 * @param {RawType} target A JavaScript raw target object to be used when
 * constructing the new R object.
 * @param {RType | 'object'} objType The type of R object to create, or 'object'
 * to infer the R object type.
 * @return {RTargetPtr} The newly created R object, given as a target object.
 */
function newRObject(target: RTargetRaw, objType: RType | 'object'): RTargetPtr {
  const RObjClass = objType === 'object' ? RObjImpl : getRObjClass(RTypeMap[objType]);
  const obj = new RObjClass(
    replaceInObject(target, isRTargetPtr, (t: RTargetPtr) => RObjImpl.wrap(t.obj.ptr)) as RTargetRaw
  );
  return {
    obj: {
      type: obj.type(),
      ptr: obj.ptr,
      methods: RObjImpl.getMethods(obj),
    },
    targetType: 'ptr',
  };
}

/**
 * For a given RObjImpl object, call the given method with arguments
 *
 * Returns a RTargetObj containing either a reference to the resulting SEXP
 * object in WASM memory, or the object represented in an equivalent raw
 * JS form.
 *
 * @param {RObjImpl} obj The R RObj object, or RObjImpl for static methods.
 * @param {string} prop RObj method to invoke
 * @param {RTargetObj[]} args List of arguments to call with
 * @return {RTargetObj} The resulting R object
 */
function callRObjMethod(
  obj: RObjImpl | typeof RObjImpl,
  prop: string,
  args: RTargetObj[]
): RTargetObj {
  if (!(prop in obj)) {
    throw new ReferenceError(`${prop} is not defined`);
  }

  const fn = obj[prop as keyof typeof obj];
  if (typeof fn !== 'function') {
    throw Error('Requested property cannot be invoked');
  }

  const res = (fn as Function).apply(
    obj,
    args.map((arg) => {
      if (arg.targetType === 'ptr') {
        return RObjImpl.wrap(arg.obj.ptr);
      }
      return replaceInObject(arg.obj, isRTargetPtr, (t: RTargetPtr) => RObjImpl.wrap(t.obj.ptr));
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
 * Evaluate the given R code and capture output
 *
 * Returns an R list object containing the result of the computation along with
 * a list of captured stream outputs and conditions.
 *
 * @param {string} code The R code to evaluate.
 * @param {RPtr} [env] An RPtr to the environment to evaluate within.
 * @param {Object<string,any>} [options={}] Options for the execution environment.
 * @param {boolean} [options.captureStreams] Should the stdout and stderr
 * output streams be captured and returned?
 * @param {boolean} [options.captureConditions] Should conditions raised during
 * execution be captured and returned?
 * @param {boolean} [options.withAutoprint] Should the code automatically print
 * output as if it were written at an R console?
 * @param {boolean} [options.withHandlers] Should the code be executed using a
 * tryCatch with handlers in place?
 * @param {boolean} [options.throwJsException] Should an R error condition be
 * re-thrown as a JS exception?
 * @return {RObjList} An R object containing the result of the computation
 * along with any other objects captured during execution.
 */
function captureR(code: string, env?: RTargetPtr, options: CaptureROptions = {}): RObjList {
  /*
    This is a sensitive area of the code where we want to be careful to avoid
    leaking objects when an exception is thrown. Here we keep track of our use
    of protect and ensure a balanced unprotect is called using try-finally.
  */
  let protectCount = 0;
  try {
    const _options: Required<CaptureROptions> = Object.assign(
      {
        captureStreams: true,
        captureConditions: true,
        withAutoprint: false,
        throwJsException: true,
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

    const tPtr = RObjImpl.true.ptr;
    const fPtr = RObjImpl.false.ptr;
    const codeStr = Module.allocateUTF8(code);
    const evalStr = Module.allocateUTF8('webr::eval_r');
    const codeObj = new RObjImpl({ targetType: 'raw', obj: code });
    Module._Rf_protect(codeObj.ptr);
    protectCount++;
    const expr = Module._Rf_lang6(
      Module._R_ParseEvalString(evalStr, RObjImpl.baseEnv.ptr),
      codeObj.ptr,
      _options.captureConditions ? tPtr : fPtr,
      _options.captureStreams ? tPtr : fPtr,
      _options.withAutoprint ? tPtr : fPtr,
      _options.withHandlers ? tPtr : fPtr
    );
    const capture = RObjImpl.wrap(
      Module._Rf_protect(Module._Rf_eval(expr, envObj.ptr))
    ) as RObjList;
    protectCount++;
    Module._free(codeStr);
    Module._free(evalStr);

    if (_options.captureConditions && _options.throwJsException) {
      const output = capture.get('output') as RObjList;
      const error = (output.toArray() as RObjImpl[]).find(
        (out) => out.get('type').toString() === 'error'
      );
      if (error) {
        throw new Error(
          error.pluck('data', 'message')?.toString() || 'An error occured evaluating R code.'
        );
      }
    }

    return capture;
  } finally {
    Module._Rf_unprotect(protectCount);
  }
}

function evalR(code: string, env?: RTargetPtr): RObjImpl {
  const capture = captureR(code, env);

  // Send captured conditions and output to the JS console. By default, captured
  // error conditions are thrown and so do not need to be handled here.
  const output = capture.get('output') as RObjList;
  for (let i = 1; i <= output.length; i++) {
    const out = output.get(i);
    const outputType = out.get('type').toString();
    switch (outputType) {
      case 'stdout':
        console.log(out.get('data').toString());
        break;
      case 'stderr':
        console.warn(out.get('data').toString());
        break;
      case 'message':
        console.warn(out.pluck('data', 'message')?.toString() || '');
        break;
      case 'warning':
        console.warn(`Warning message: \n${out.pluck('data', 'message')?.toString() || ''}`);
        break;
      default:
        console.warn(`Output of type ${outputType}:`);
        console.warn(out.get('data').toJs());
        break;
    }
  }
  return capture.get('result');
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

  // Don't instantiate .so libraries packaged through `WEBR_REPO` too
  // early. Otherwise C++ libraries with dynamic initialisation of
  // global variables might call into the R API too early, before R has
  // started.
  Module.noWasmDecoding = true;

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
      evalR(`options(webr_pkg_repos="${_config.PKG_URL}")`);
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
        return (0, eval)(Module.UTF8ToString(code));
      } catch (e) {
        const stop = Module.allocateUTF8('stop');
        const msg = Module.allocateUTF8(
          `An error occured during JavaScript evaluation:\n  ${(e as { message: string }).message}`
        );

        const ffiMsg = Module._Rf_protect(Module._Rf_mkString(msg));
        const call = Module._Rf_protect(Module._Rf_lang2(Module._Rf_install(stop), ffiMsg));
        Module._free(stop);
        Module._free(msg);

        Module._Rf_eval(call, RObjImpl.baseEnv.ptr);
      }
      throwUnreachable();
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
