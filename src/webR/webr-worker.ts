import { loadScript } from './compat';
import { ChannelWorker } from './chan/channel';
import { newChannelWorker, ChannelInitMessage, ChannelType } from './chan/channel-common';
import { Message, Request, newResponse } from './chan/message';
import { FSMountOptions, FSNode, WebROptions } from './webr-main';
import { EmPtr, Module } from './emscripten';
import { IN_NODE } from './compat';
import { replaceInObject, throwUnreachable } from './utils';
import { WebRPayloadRaw, WebRPayloadPtr, WebRPayloadWorker, isWebRPayloadPtr } from './payload';
import { RPtr, RType, RCtor, WebRData, WebRDataRaw } from './robj';
import { protect, protectInc, unprotect, parseEvalBare, UnwindProtectException, safeEval } from './utils-r';
import { generateUUID } from './chan/task-common';
import { mountFS, mountImageUrl, mountImagePath, mountDriveFS } from './mount';
import type { parentPort } from 'worker_threads';

import {
  CallRObjectMethodMessage,
  CaptureRMessage,
  EvalROptions,
  EvalRMessage,
  EvalRMessageRaw,
  FSMessage,
  FSReadFileMessage,
  FSMountMessage,
  FSWriteFileMessage,
  InvokeWasmFunctionMessage,
  NewRObjectMessage,
  ShelterMessage,
  ShelterDestroyMessage,
  InstallPackagesMessage,
  FSSyncfsMessage,
  FSRenameMessage,
} from './webr-chan';

import {
  RCall,
  RCharacter,
  RComplex,
  RDataFrame,
  RDouble,
  REnvironment,
  RInteger,
  RList,
  RLogical,
  RObject,
  RPairlist,
  RRaw,
  RString,
  RSymbol,
  destroy,
  getRWorkerClass,
  initPersistentObjects,
  isRObject,
  keep,
  objs,
  purge,
  shelters,
} from './robj-worker';

let initialised = false;
let resolved = false;
let chan: ChannelWorker | undefined;

// Make webR Worker R objects available in WorkerGlobalScope
Object.assign(globalThis, {
  RCall,
  RCharacter,
  RComplex,
  RDataFrame,
  RDouble,
  REnvironment,
  RInteger,
  RList,
  RLogical,
  RObject,
  RPairlist,
  RRaw,
  RString,
  RSymbol,
  destroy,
  getRWorkerClass,
  initPersistentObjects,
  isRObject,
  keep,
  objs,
  purge,
  shelters,
});

const onWorkerMessage = function (msg: Message) {
  if (!msg || !msg.type) {
    return;
  }
  if (msg.type === 'init') {
    if (initialised) {
      throw new Error("Can't initialise worker multiple times.");
    }
    const messageInit = msg as ChannelInitMessage;
    chan = newChannelWorker(messageInit);
    messageInit.data.config.channelType = messageInit.data.channelType;
    init(messageInit.data.config);
    initialised = true;
    return;
  }
  chan?.onMessageFromMainThread(msg);
};

if (IN_NODE) {
  const workerThreads = require('worker_threads') as {
    parentPort: typeof parentPort;
  };
  workerThreads.parentPort!.on('message', onWorkerMessage);
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

      const write = (resp: WebRPayloadWorker, transferables?: [Transferable]) =>
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
          case 'mount': {
            const msg = reqMsg as FSMountMessage;
            const type = msg.data.type;
            const mountpoint = msg.data.mountpoint;
            if (type === "IDBFS" && _config.channelType == ChannelType.SharedArrayBuffer) {
              throw new Error(
                'The `IDBFS` filesystem type is not supported under the `SharedArrayBuffer` ' +
                'communication channel. The `PostMessage` communication channel must be used.'
              );
            }

            if (type === "DRIVEFS") {
              const options = msg.data.options as FSMountOptions<typeof type>;
              const driveName = options.driveName || '';
              mountDriveFS(driveName, mountpoint);
            } else {
              const fs = Module.FS.filesystems[type];
              Module.FS.mount(fs, msg.data.options, mountpoint);
            }

            write({ obj: null, payloadType: 'raw' });
            break;
          }
          case 'syncfs': {
            const msg = reqMsg as FSSyncfsMessage;
            Module.FS.syncfs(msg.data.populate, (err: string | undefined) => {
              if (err) {
                throw new Error(`Emscripten \`syncfs\` error: "${err}".`);
              }
              write({ obj: null, payloadType: 'raw' });
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
            write(out as WebRPayloadRaw, [out.obj.buffer]);
            break;
          }
          case 'rename': {
            const msg = reqMsg as FSRenameMessage;
            write({
              obj: Module.FS.rename(msg.data.oldpath, msg.data.newpath),
              payloadType: 'raw',
            });
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
          case 'unmount': {
            const msg = reqMsg as FSMessage;
            write({
              obj: Module.FS.unmount(msg.data.path),
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
              const capture = captureR(data.code, data.options);
              protectInc(capture.result, prot);
              protectInc(capture.output, prot);

              const result = capture.result;
              keep(shelter, result);

              const n = capture.output.length;
              const output: any[] = [];

              for (let i = 1; i < n + 1; ++i) {
                const out = capture.output.get(i);
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
                  images: capture.images,
                },
              });
            } finally {
              unprotect(prot.n);
            }
            break;
          }

          case 'evalR': {
            const msg = reqMsg as EvalRMessage;

            const result = evalR(msg.data.code, msg.data.options);
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

          case 'evalRRaw': {
            const msg = reqMsg as EvalRMessageRaw;
            const result = evalR(msg.data.code, msg.data.options);

            protect(result);

            const throwType = () => {
              throw new Error(`Can't convert object of type ${result.type()} to ${msg.data.outputType}.`);
            };

            try {
              let out: WebRDataRaw = undefined;
              switch (msg.data.outputType) {
                case 'void':
                  break;
                case 'boolean':
                  switch (result.type()) {
                    case 'logical':
                      out = (result as RLogical).toBoolean();
                      break;
                    default:
                      throwType();
                  }
                  break;
                case 'boolean[]':
                  switch (result.type()) {
                    case 'logical':
                      out = (result as RLogical).toArray();
                      if (out.some((i) => i === null)) {
                        throwType();
                      }
                      break;
                    default:
                      throwType();
                  }
                  break;
                case 'number':
                  switch (result.type()) {
                    case 'logical':
                      out = (result as RLogical).toBoolean();
                      out = Number(out);
                      break;
                    case 'integer':
                      out = (result as RInteger).toNumber();
                      break;
                    case 'double':
                      out = (result as RDouble).toNumber();
                      break;
                    default:
                      throwType();
                  }
                  break;
                case 'number[]':
                  switch (result.type()) {
                    case 'logical':
                      out = (result as RLogical).toArray();
                      out = out.map((i) => i === null ? throwType() : Number(i));
                      break;
                    case 'integer':
                      out = (result as RInteger).toArray();
                      if (out.some((i) => i === null)) {
                        throwType();
                      }
                      break;
                    case 'double':
                      out = (result as RDouble).toArray();
                      if (out.some((i) => i === null)) {
                        throwType();
                      }
                      break;
                    default:
                      throwType();
                  }
                  break;
                case 'string':
                  switch (result.type()) {
                    case 'character':
                      out = (result as RCharacter).toString();
                      break;
                    default:
                      throwType();
                  }
                  break;
                case 'string[]':
                  switch (result.type()) {
                    case 'character':
                      out = (result as RCharacter).toArray();
                      if (out.some((i) => i === null)) {
                        throwType();
                      }
                      break;
                    default:
                      throwType();
                  }
                  break;
                default:
                  throw new Error('Unexpected output type in `evalRRaw().');
              }

              write({
                obj: out,
                payloadType: 'raw',
              });
              break;
            } finally {
              unprotect(1);
            }
          }

          case 'newRObject': {
            const msg = reqMsg as NewRObjectMessage;

            const payload = newRObject(msg.data.args, msg.data.objType);
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

          case 'invokeWasmFunction': {
            const msg = reqMsg as InvokeWasmFunctionMessage;
            const res = Module.getWasmTableEntry(msg.data.ptr)(...msg.data.args);
            write({
              payloadType: 'raw',
              obj: res,
            });
            break;
          }

          case 'installPackages': {
            const msg = reqMsg as InstallPackagesMessage;
            let pkgs = msg.data.name;
            let repos = msg.data.options.repos ? msg.data.options.repos : _config.repoUrl;
            if (typeof pkgs === "string") pkgs = [pkgs];
            if (typeof repos === "string") repos = [repos];
            evalR(`webr::install(
              c(${pkgs.map((r) => '"' + r + '"').join(',')}),
              repos = c(${repos.map((r) => '"' + r + '"').join(',')}),
              quiet = ${msg.data.options.quiet ? 'TRUE' : 'FALSE'},
              mount = ${msg.data.options.mount ? 'TRUE' : 'FALSE'}
            )`);

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
        const e = _e as Error & { errno?: number };
        const errorObj = {
          name: e.name,
          message: e.message,
          errno: e.errno,
          stack: e.stack
        };
        write({ payloadType: 'err', obj: errorObj });

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
  const retObj: FSNode = {
    id: obj.id,
    name: obj.name,
    mode: obj.mode,
    isFolder: obj.isFolder,
    mounted: null,
    contents: {},
  };
  if (obj.isFolder && obj.contents) {
    retObj.contents = Object.fromEntries(
      Object.entries(obj.contents).map(([name, node]) => [name, copyFSNode(node)])
    );
  }
  if (obj.mounted !== null) {
    retObj.mounted = {
      mountpoint: obj.mounted.mountpoint,
      root: copyFSNode(obj.mounted.root),
    };
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
    const responseText = 'An error occurred setting headers in XMLHttpRequest';
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
    return { status: 400, response: 'An error occurred in XMLHttpRequest' };
  }
}

function newRObject(args: WebRData[], objType: RType | RCtor): WebRPayloadPtr {
  const RClass = getRWorkerClass(objType);
  const _args = replaceInObject<WebRData[]>(args, isWebRPayloadPtr, (t: WebRPayloadPtr) =>
    RObject.wrap(t.obj.ptr)
  );
  const obj = new RClass(..._args);
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
  args: WebRPayloadWorker[]
): WebRPayloadWorker {
  if (!(prop in obj)) {
    throw new ReferenceError(`${prop} is not defined`);
  }

  const fn = obj[prop as keyof typeof obj];
  if (typeof fn !== 'function') {
    throw Error('Requested property cannot be invoked');
  }

  const res = (fn as (...args: unknown[]) => unknown).apply(
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

function captureR(expr: string | RObject, options: EvalROptions = {}): {
  result: RObject,
  output: RList,
  images: ImageBitmap[],
} {
  const _options: Required<EvalROptions> = Object.assign(
    {
      env: objs.globalEnv,
      captureStreams: true,
      captureConditions: true,
      captureGraphics: typeof OffscreenCanvas !== 'undefined',
      withAutoprint: false,
      throwJsException: true,
      withHandlers: true,
    },
    replaceInObject(options, isWebRPayloadPtr, (t: WebRPayloadPtr) =>
      RObject.wrap(t.obj.ptr)
    )
  );

  const prot = { n: 0 };
  const devEnvObj = new REnvironment({});
  protectInc(devEnvObj, prot);

  // Set the session as non-interactive
  Module.setValue(Module._R_Interactive, 0, 'i8');

  try {
    const envObj = new REnvironment(_options.env);
    protectInc(envObj, prot);
    if (envObj.type() !== 'environment') {
      throw new Error('Attempted to evaluate R code with invalid environment object');
    }

    // Start a capturing canvas graphics device, if required
    if (_options.captureGraphics) {
      if (typeof OffscreenCanvas === 'undefined') {
        throw new Error(
          'This environment does not have support for OffscreenCanvas. ' +
          'Consider disabling plot capture using `captureGraphics: false`.'
        );
      }

      // User supplied canvas arguments, if any. Default: `capture = TRUE`
      devEnvObj.bind('canvas_options', new RList(Object.assign({
        capture: true
      }, _options.captureGraphics)));

      parseEvalBare(`{
        old_dev <- dev.cur()
        do.call(webr::canvas, canvas_options)
        new_dev <- dev.cur()
        old_cache <- webr::canvas_cache()
        plots <- numeric()
      }`, devEnvObj);
    }

    const tPtr = objs.true.ptr;
    const fPtr = objs.false.ptr;

    const fn = parseEvalBare('webr::eval_r', objs.baseEnv);
    const qu = parseEvalBare('quote', objs.baseEnv);
    protectInc(fn, prot);
    protectInc(qu, prot);

    const exprObj = new RObject(expr);
    protectInc(exprObj, prot);

    const call = Module._Rf_lang6(
      fn.ptr,
      Module._Rf_lang2(qu.ptr, exprObj.ptr),
      _options.captureConditions ? tPtr : fPtr,
      _options.captureStreams ? tPtr : fPtr,
      _options.withAutoprint ? tPtr : fPtr,
      _options.withHandlers ? tPtr : fPtr
    );
    protectInc(call, prot);

    // Evaluate the given expression
    const capture = RList.wrap(safeEval(call, envObj));
    protectInc(capture, prot);

    // If we've captured an error, throw it as a JS Exception
    if (_options.captureConditions && _options.throwJsException) {
      const output = capture.get('output') as RList;
      const error = (output.toArray() as RObject[]).find(
        (out) => out.get('type').toString() === 'error'
      );
      if (error) {
        const call = error.pluck('data', 'call') as RCall;
        const source = call && call.type() === 'call' ? `\`${call.deparse()}\`` : 'unknown source';
        const message = error.pluck('data', 'message')?.toString() || 'An error occurred evaluating R code.';
        throw new Error(`Error in ${source}: ${message}`);
      }
    }

    let images: ImageBitmap[] = [];
    if (_options.captureGraphics) {
      // Find new plots after evaluating the given expression
      const plots = parseEvalBare(`{
        new_cache <- webr::canvas_cache()
        plots <- setdiff(new_cache, old_cache)
      }`, devEnvObj) as RInteger;
      protectInc(plots, prot);

      images = plots.toArray().map((idx) => {
        return Module.webr.canvas[idx!].offscreen.transferToImageBitmap();
      });
    }

    // Build the capture object to be returned to the caller
    return {
      result: capture.get('result'),
      output: capture.get('output') as RList,
      images,
    };
  } finally {
    // Restore the session's interactive status
    Module.setValue(Module._R_Interactive, _config.interactive ? 1 : 0, 'i8');

    // Close the device and destroy newly created canvas cache entries
    const newDev = devEnvObj.get('new_dev');
    if (_options.captureGraphics && newDev.type() !== "null") {
      parseEvalBare(`{
        dev.off(new_dev)
        dev.set(old_dev)
        webr::canvas_destroy(plots)
      }`, devEnvObj);
    }
    unprotect(prot.n);
  }
}

function evalR(expr: string | RObject, options: EvalROptions = {}): RObject {
  // Defaults for evalR that should differ from the defaults in captureR
  options = Object.assign({
    captureGraphics: false
  }, options);

  const prot = { n: 0 };
  const capture = captureR(expr, options);

  try {
    protectInc(capture.output, prot);
    protectInc(capture.result, prot);
    // Send captured conditions and output to the JS console. By default, captured
    // error conditions are thrown and so do not need to be handled here.
    for (let i = 1; i <= capture.output.length; i++) {
      const out = capture.output.get(i);
      const outputType = out.get('type').toString();
      switch (outputType) {
        case 'stdout':
          chan?.writeSystem({ type: 'console.log', data: out.get('data').toString() });
          break;
        case 'stderr':
          chan?.writeSystem({ type: 'console.warn', data: out.get('data').toString() });
          break;
        case 'message':
          chan?.writeSystem({
            type: 'console.warn',
            data: out.pluck('data', 'message')?.toString() || '',
          });
          break;
        case 'warning':
          chan?.writeSystem({
            type: 'console.warn',
            data: `Warning message: \n${out.pluck('data', 'message')?.toString() || ''}`,
          });
          break;
        default:
          chan?.writeSystem({ type: 'console.warn', data: `Output of type ${outputType}:` });
          chan?.writeSystem({ type: 'console.warn', data: out.get('data').toJs() });
          break;
      }
    }
    return capture.result;
  } finally {
    unprotect(prot.n);
  }
}

function init(config: Required<WebROptions>) {
  _config = config;

  const env = { ...config.REnv };
  if (!env.TZ) {
    const fmt = new Intl.DateTimeFormat();
    env.TZ = fmt.resolvedOptions().timeZone;
  }

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
      (globalThis as any).chan = chan;
    }
    if (_config.createLazyFilesystem) {
      Module.createLazyFilesystem();
    }
    Module.FS.mkdirTree(_config.homedir);
    Module.ENV.HOME = _config.homedir;
    Module.FS.chdir(_config.homedir);
    Module.ENV = Object.assign(Module.ENV, env);

    // Hook Emscripten's FS.mount() to handle ArrayBuffer data from the channel
    Module.FS._mount = Module.FS.mount;
    Module.FS.mount = mountFS;
  });

  chan?.setDispatchHandler(dispatch);

  Module.onRuntimeInitialized = () => {
    chan?.run(_config.RArgs);
  };

  Module.webr = {
    UnwindProtectException: UnwindProtectException,
    evalR: evalR,
    captureR: captureR,
    channel: chan,
    canvas: {},

    resolveInit: () => {
      initPersistentObjects();
      chan?.setInterrupt(Module._Rf_onintr);
      Module.setValue(Module._R_Interactive, _config.interactive ? 1 : 0, 'i8');
      evalR(`options(webr_pkg_repos="${_config.repoUrl}")`);
      chan?.resolve();
      resolved = true;
    },

    setPrompt: (prompt: string) => {
      chan?.write({ type: 'prompt', data: prompt });
    },

    readConsole: () => {
      if (!chan) {
        throw new Error("Can't read console input without a communication channel");
      }
      if (!resolved) Module.webr.resolveInit();
      return chan.inputOrDispatch();
    },

    handleEvents: () => {
      chan?.handleInterrupt();
    },

    dataViewer: (ptr: RPtr, title: string) => {
      const data = RList.wrap(ptr).toObject({ depth: 0 });
      chan?.write({ type: 'view', data: { data, title } });
    },

    evalJs: (code: RPtr): RPtr => {
      try {
        const js = (0, eval)(Module.UTF8ToString(code)) as WebRData;
        return (new RObject(js)).ptr;
      } catch (e) {
        /* Capture continuation token and resume R's non-local transfer here.
         * By resuming here we avoid potentially unwinding a target intermediate
         * R stack on the way up to the top level.
         */
        if (e instanceof UnwindProtectException) {
          Module._R_ContinueUnwind(e.cont);
          throwUnreachable();
        } else if (e === Infinity) {
          // Propagate interruption
          throw e;
        }
        const msg = Module.allocateUTF8OnStack(
          `An error occurred during JavaScript evaluation:\n  ${(e as { message: string }).message}`
        );
        Module._Rf_error(msg);
      }
      throwUnreachable();
      return 0;
    },

    setTimeoutWasm: (ptr: EmPtr, delay: number, ...args: number[]): void => {
      chan?.writeSystem({ type: 'setTimeoutWasm', data: { ptr, delay, args } });
    },
  };

  Module.locateFile = (path: string) => _config.baseUrl + path;
  Module.downloadFileContent = downloadFileContent;
  Module.mountImageUrl = mountImageUrl;
  Module.mountImagePath = mountImagePath;
  Module.mountDriveFS = mountDriveFS;

  Module.print = (text: string) => {
    chan?.write({ type: 'stdout', data: text });
  };

  Module.printErr = (text: string) => {
    chan?.write({ type: 'stderr', data: text });
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (globalThis as any).Module = Module;

  // At the next tick, launch the REPL. This never returns.
  setTimeout(() => {
    const scriptSrc = `${_config.baseUrl}R.js`;
    void loadScript(scriptSrc);
  });
}
