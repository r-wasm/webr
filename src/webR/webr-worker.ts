import { loadScript } from './compat';
import { ChannelWorker } from './chan/channel';
import { newChannelWorker, ChannelInitMessage } from './chan/channel-common';
import { Message, Request, newResponse } from './chan/message';
import { FSNode, WebROptions } from './webr-main';
import { Module } from './emscripten';
import { IN_NODE } from './compat';
import { replaceInObject, throwUnreachable } from './utils';
import { WebRPayloadPtr, WebRPayload, isWebRPayloadPtr } from './payload';
import { RObject, isRObject, REnvironment, RList, getRWorkerClass } from './robj-worker';
import { RCharacter, RString, keep, destroy, purge, shelters } from './robj-worker';
import { RPtr, RType, RTypeMap, WebRData, WebRDataRaw } from './robj';
import { protectInc, unprotect, parseEvalBare, UnwindProtectException, safeEval } from './utils-r';
import { generateUUID } from './chan/task-common';

import {
  CallRObjectMethodMessage,
  CaptureRMessage,
  CaptureROptions,
  EvalRMessage,
  FSMessage,
  FSReadFileMessage,
  FSWriteFileMessage,
  NewRObjectMessage,
  ShelterMessage,
  ShelterDestroyMessage,
} from './webr-chan';

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

let _config: Required<WebROptions>;

function dispatch(msg: Message): void {
  switch (msg.type) {
    case 'request': {
      const req = msg as Request;
      const reqMsg = req.data.msg;

      const write = (resp: any, transferables?: [Transferable]) =>
        chan?.write(newResponse(req.data.uuid, resp, transferables));
      try {
        switch (reqMsg.type) {
          case 'lookupPath': {
            const msg = reqMsg as FSMessage;
            const node = Module.FS.lookupPath(msg.data.path, {}).node;
            write({
              obj: copyFSNode(node as FSNode),
              payloadType: 'raw',
            });
            break;
          }
          case 'mkdir': {
            const msg = reqMsg as FSMessage;
            write({
              obj: copyFSNode(Module.FS.mkdir(msg.data.path) as FSNode),
              payloadType: 'raw',
            });
            break;
          }
          case 'readFile': {
            const msg = reqMsg as FSReadFileMessage;
            const reqData = msg.data;
            const out = {
              obj: Module.FS.readFile(reqData.path, {
                encoding: 'binary',
                flags: reqData.flags,
              }),
              payloadType: 'raw',
            };
            write(out, [out.obj.buffer]);
            break;
          }
          case 'rmdir': {
            const msg = reqMsg as FSMessage;
            write({
              obj: Module.FS.rmdir(msg.data.path),
              payloadType: 'raw',
            });
            break;
          }
          case 'writeFile': {
            const msg = reqMsg as FSWriteFileMessage;
            const reqData = msg.data;
            // FIXME: Use a replacer + reviver to transfer Uint8Array
            const data = Uint8Array.from(Object.values(reqData.data));
            write({
              obj: Module.FS.writeFile(reqData.path, data, { flags: reqData.flags }),
              payloadType: 'raw',
            });
            break;
          }
          case 'unlink': {
            const msg = reqMsg as FSMessage;
            write({
              obj: Module.FS.unlink(msg.data.path),
              payloadType: 'raw',
            });
            break;
          }

          case 'newShelter': {
            const id = generateUUID();
            shelters.set(id, []);

            write({
              payloadType: 'raw',
              obj: id,
            });
            break;
          }

          case 'shelterSize': {
            const msg = reqMsg as ShelterMessage;
            const size = shelters.get(msg.data)!.length;

            write({ payloadType: 'raw', obj: size });
            break;
          }

          case 'shelterPurge': {
            const msg = reqMsg as ShelterMessage;
            purge(msg.data);

            write({ payloadType: 'raw', obj: null });
            break;
          }

          case 'shelterDestroy': {
            const msg = reqMsg as ShelterDestroyMessage;
            destroy(msg.data.id, msg.data.obj.obj.ptr);

            write({ payloadType: 'raw', obj: null });
            break;
          }

          case 'captureR': {
            const msg = reqMsg as CaptureRMessage;
            const data = msg.data;

            const shelter = data.shelter;
            const prot = { n: 0 };

            try {
              const capture = captureR(data.code, data.env, data.options);
              protectInc(capture, prot);

              const result = capture.get('result');
              const outputs = capture.get(2) as RList;

              keep(shelter, result);

              const n = outputs.length;
              const output: any[] = [];

              for (let i = 1; i < n + 1; ++i) {
                const out = outputs.get(i);
                const type = (out.pluck(1, 1) as RCharacter).toString();
                const data = out.get(2);

                if (type === 'stdout' || type === 'stderr') {
                  const msg = (data as RString).toString();
                  output.push({ type, data: msg });
                } else {
                  keep(shelter, data);
                  const payload = {
                    obj: {
                      ptr: data.ptr,
                      type: data.type(),
                      methods: RObject.getMethods(data),
                    },
                    payloadType: 'ptr',
                  } as WebRPayloadPtr;
                  output.push({ type, data: payload });
                }
              }

              const resultPayload = {
                payloadType: 'ptr',
                obj: {
                  ptr: result.ptr,
                  type: result.type(),
                  methods: RObject.getMethods(result),
                },
              } as WebRPayloadPtr;

              write({
                payloadType: 'raw',
                obj: {
                  result: resultPayload,
                  output: output,
                },
              });
            } finally {
              unprotect(prot.n);
            }
            break;
          }

          case 'evalR': {
            const msg = reqMsg as EvalRMessage;

            const result = evalR(msg.data.code, msg.data.env);
            keep(msg.data.shelter, result);

            write({
              obj: {
                type: result.type(),
                ptr: result.ptr,
                methods: RObject.getMethods(result),
              },
              payloadType: 'ptr',
            });
            break;
          }

          case 'newRObject': {
            const msg = reqMsg as NewRObjectMessage;

            const payload = newRObject(msg.data.obj, msg.data.objType);
            keep(msg.data.shelter, payload.obj.ptr);

            write(payload);
            break;
          }

          case 'callRObjectMethod': {
            const msg = reqMsg as CallRObjectMethodMessage;
            const data = msg.data;
            const obj = data.payload ? RObject.wrap(data.payload.obj.ptr) : RObject;

            const payload = callRObjectMethod(obj, data.prop, data.args);
            if (isWebRPayloadPtr(payload)) {
              // TODO: Remove `!`
              keep(data.shelter!, payload.obj.ptr);
            }

            write(payload);
            break;
          }

          case 'installPackage': {
            // TODO: Use `evalRVoid()`
            evalR(`webr::install("${reqMsg.data.name as string}", repos="${_config.PKG_URL}")`);

            write({
              obj: true,
              payloadType: 'raw',
            });
            break;
          }
          default:
            throw new Error('Unknown event `' + reqMsg.type + '`');
        }
      } catch (_e) {
        const e = _e as Error;
        write({
          payloadType: 'err',
          obj: { name: e.name, message: e.message, stack: e.stack },
        });

        /* Capture continuation token and resume R's non-local transfer.
         * If the exception has reached this point there should no longer be
         * any `evalJs()` calls on the stack. As such, we assume there are no R
         * calls above us and it is safe to `longjmp` from here.
         */
        if (e instanceof UnwindProtectException) {
          Module._R_ContinueUnwind(e.cont);
          throwUnreachable();
        }
      }
      break;
    }
    default:
      throw new Error('Unknown event `' + msg.type + '`');
  }
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

function newRObject(data: WebRData, objType: RType | 'object'): WebRPayloadPtr {
  const RClass = objType === 'object' ? RObject : getRWorkerClass(RTypeMap[objType]);
  const obj = new RClass(
    replaceInObject(data, isWebRPayloadPtr, (t: WebRPayloadPtr) =>
      RObject.wrap(t.obj.ptr)
    ) as WebRData
  );
  return {
    obj: {
      type: obj.type(),
      ptr: obj.ptr,
      methods: RObject.getMethods(obj),
    },
    payloadType: 'ptr',
  };
}

function callRObjectMethod(
  obj: RObject | typeof RObject,
  prop: string,
  args: WebRPayload[]
): WebRPayload {
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
      if (arg.payloadType === 'ptr') {
        return RObject.wrap(arg.obj.ptr);
      }
      return replaceInObject(arg.obj, isWebRPayloadPtr, (t: WebRPayloadPtr) =>
        RObject.wrap(t.obj.ptr)
      );
    })
  ) as WebRData;

  const ret = replaceInObject(res, isRObject, (obj: RObject) => {
    return {
      obj: { type: obj.type(), ptr: obj.ptr, methods: RObject.getMethods(obj) },
      payloadType: 'ptr',
    };
  }) as WebRDataRaw;

  return { obj: ret, payloadType: 'raw' };
}

function captureR(code: string, env?: WebRPayloadPtr, options: CaptureROptions = {}): RList {
  const prot = { n: 0 };

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

    let envObj = RObject.globalEnv;
    if (env) {
      envObj = REnvironment.wrap(env.obj.ptr);
      if (envObj.type() !== 'environment') {
        throw new Error('Attempted to eval R code with an env argument with invalid SEXP type');
      }
    }

    const tPtr = RObject.true.ptr;
    const fPtr = RObject.false.ptr;

    const fn = parseEvalBare('webr::eval_r', RObject.baseEnv);
    protectInc(fn, prot);

    const codeObj = new RCharacter(code);
    protectInc(codeObj, prot);

    const call = Module._Rf_lang6(
      fn.ptr,
      codeObj.ptr,
      _options.captureConditions ? tPtr : fPtr,
      _options.captureStreams ? tPtr : fPtr,
      _options.withAutoprint ? tPtr : fPtr,
      _options.withHandlers ? tPtr : fPtr
    );
    protectInc(call, prot);

    const capture = RList.wrap(safeEval(call, envObj.ptr));
    protectInc(capture, prot);

    if (_options.captureConditions && _options.throwJsException) {
      const output = capture.get('output') as RList;
      const error = (output.toArray() as RObject[]).find(
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
    unprotect(prot.n);
  }
}

function evalR(code: string, env?: WebRPayloadPtr): RObject {
  const capture = captureR(code, env, undefined);
  Module._Rf_protect(capture.ptr);

  try {
    // Send captured conditions and output to the JS console. By default, captured
    // error conditions are thrown and so do not need to be handled here.
    const output = capture.get('output') as RList;
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
  } finally {
    Module._Rf_unprotect(1);
  }
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
    UnwindProtectException: UnwindProtectException,
    resolveInit: () => {
      chan?.setInterrupt(Module._Rf_onintr);
      Module.setValue(Module._R_Interactive, _config.interactive, '*');
      evalR(`options(webr_pkg_repos="${_config.PKG_URL}")`);
      chan?.resolve();
    },

    readConsole: () => {
      if (!chan) {
        throw new Error("Can't read console input without a communication channel");
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
        /* Capture continuation token and resume R's non-local transfer here.
         * By resuming here we avoid potentially unwinding a target intermediate
         * R stack on the way up to the top level.
         */
        if (e instanceof UnwindProtectException) {
          Module._R_ContinueUnwind(e.cont);
          throwUnreachable();
        }
        const msg = Module.allocateUTF8OnStack(
          `An error occured during JavaScript evaluation:\n  ${(e as { message: string }).message}`
        );
        Module._Rf_error(msg);
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
