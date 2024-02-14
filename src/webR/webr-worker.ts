import { loadScript } from './compat';
import { ChannelWorker } from './chan/channel';
import { newChannelWorker, ChannelInitMessage } from './chan/channel-common';
import { Message, Request, newResponse } from './chan/message';
import { FSNode, WebROptions } from './webr-main';
import { EmPtr, Module } from './emscripten';
import { IN_NODE } from './compat';
import { replaceInObject, throwUnreachable } from './utils';
import { WebRPayloadRaw, WebRPayloadPtr, WebRPayloadWorker, isWebRPayloadPtr } from './payload';
import { RObject, isRObject, REnvironment, RList, getRWorkerClass } from './robj-worker';
import { RCharacter, RString, keep, destroy, purge, shelters } from './robj-worker';
import { RLogical, RInteger, RDouble, initPersistentObjects, objs } from './robj-worker';
import { RPtr, RType, RTypeMap, WebRData, WebRDataRaw } from './robj';
import { protect, protectInc, unprotect, parseEvalBare, UnwindProtectException, safeEval } from './utils-r';
import { generateUUID } from './chan/task-common';

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
} from './webr-chan';

let initialised = false;
let chan: ChannelWorker | undefined;

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
    init(messageInit.data.config);
    initialised = true;
    return;
  }
  chan?.onMessageFromMainThread(msg);
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

type WorkerFileSystemType = Emscripten.FileSystemType & {
  reader: { readAsArrayBuffer: (chunk: any) => ArrayBuffer },
  FILE_MODE: number
  createNode: (dir: FS.FSNode, file: string, mode: number, dev: number,
    contents: ArrayBufferView, mtime?: Date) => FS.FSNode;
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
            const fs = Module.FS.filesystems[msg.data.type];
            Module.FS.mount(fs, msg.data.options, msg.data.mountpoint);
            write({ obj: null, payloadType: 'raw' });
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

          case 'invokeWasmFunction': {
            const msg = reqMsg as InvokeWasmFunctionMessage;
            const res = Module.getWasmTableEntry(msg.data.ptr)(...msg.data.args) as number;
            write({
              payloadType: 'raw',
              obj: res,
            });
            break;
          }

          case 'installPackage': {
            const msg = reqMsg as InstallPackagesMessage;
            evalR(`webr::install(
              "${msg.data.name}",
              repos = "${msg.data.options.repos ? msg.data.options.repos : _config.repoUrl}",
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

function mountImageData(data: any, metadata: { files: any[] }, mountpoint: string) {
  if (IN_NODE) {
    const buf = data as Buffer;
    const WORKERFS = Module.FS.filesystems.WORKERFS as WorkerFileSystemType;

    if (!WORKERFS.reader) WORKERFS.reader = {
      readAsArrayBuffer: (chunk: Buffer) => new Uint8Array(chunk),
    };

    metadata.files.forEach((f: {filename: string, start: number, end: number}) => {
      const contents: Buffer & { size?: number } = buf.subarray(f.start, f.end);
      contents.size = contents.byteLength;
      contents.slice = (start?: number, end?: number) => {
        const sub: Buffer & { size?: number } = contents.subarray(start, end);
        sub.size = sub.byteLength;
        return sub;
      };
      const parts = (mountpoint + f.filename).split('/');
      const file = parts.pop();
      if (!file) {
        throw new Error(`Invalid mount path "${mountpoint}${f.filename}".`);
      }
      const dir = parts.join('/');
      Module.FS.mkdirTree(dir);
      const dirNode = Module.FS.lookupPath(dir, {}).node;
      WORKERFS.createNode(dirNode, file, WORKERFS.FILE_MODE, 0, contents);
    });
  } else {
    Module.FS.mount(Module.FS.filesystems.WORKERFS, {
      packages: [{
        blob: new Blob([data]),
        metadata,
      }],
    }, mountpoint);
  }
}

// Download an Emscripten FS image and mount to the VFS
function mountImageUrl(url: string, mountpoint: string) {
  const dataResp = downloadFileContent(url);
  const metaResp = downloadFileContent(url.replace(new RegExp('.data$'), '.js.metadata'));

  if (dataResp.status < 200 || dataResp.status >= 300
      || metaResp.status < 200 || metaResp.status >= 300) {
    throw new Error('Unable to download Emscripten filesystem image.' +
      'See the JavaScript console for further details.');
  }

  mountImageData(
    dataResp.response,
    JSON.parse(new TextDecoder().decode(metaResp.response as ArrayBuffer)) as { files: any[] },
    mountpoint
  );
}

// Read an Emscripten FS image from disk and mount to the VFS (requires Node)
function mountImagePath(path: string, mountpoint: string) {
  const buf = require('fs').readFileSync(path) as Buffer;
  const metadata = JSON.parse(require('fs').readFileSync(
    path.replace(new RegExp('.data$'), '.js.metadata'),
    'utf8'
  ) as string) as { files: any[] };
  mountImageData(buf, metadata, mountpoint);
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
  args: WebRPayloadWorker[]
): WebRPayloadWorker {
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

function captureR(expr: string | RObject, options: EvalROptions = {}): {
  result: RObject,
  output: RList,
  images: ImageBitmap[],
} {
  const prot = { n: 0 };
  try {
    const _options: Required<EvalROptions> = Object.assign(
      {
        env: objs.globalEnv,
        captureStreams: true,
        captureConditions: true,
        captureGraphics: true,
        withAutoprint: false,
        throwJsException: true,
        withHandlers: true,
      },
      replaceInObject(options, isWebRPayloadPtr, (t: WebRPayloadPtr) =>
        RObject.wrap(t.obj.ptr)
      )
    );

    const envObj = new REnvironment(_options.env);
    protectInc(envObj, prot);
    if (envObj.type() !== 'environment') {
      throw new Error('Attempted to evaluate R code with invalid environment object');
    }

    // Start a capturing canvas graphics device, if required
    const devEnvObj = new REnvironment({});
    protectInc(devEnvObj, prot);
    if (_options.captureGraphics) {
      parseEvalBare(`{
        old_dev <- dev.cur()
        webr::canvas(capture = TRUE)
        new_dev <- dev.cur()
        old_cache <- webr::canvas_cache()
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
        throw new Error(
          error.pluck('data', 'message')?.toString() || 'An error occurred evaluating R code.'
        );
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
        return Module.webr.canvas[idx!].offscreen.transferToImageBitmap()
      });

      // Close the device and destroy newly created canvas cache entries
      parseEvalBare(`{
        dev.off(new_dev)
        dev.set(old_dev)
        webr::canvas_destroy(plots)
      }`, devEnvObj);
    }

    // Build the capture object to be returned to the caller
    return {
      result: capture.get('result'),
      output: capture.get('output') as RList,
      images,
    };
  } finally {
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
  });

  chan?.setDispatchHandler(dispatch);

  Module.onRuntimeInitialized = () => {
    chan?.run(_config.RArgs);
  };

  Module.webr = {
    UnwindProtectException: UnwindProtectException,
    evalR: evalR,
    captureR: captureR,
    canvas: {},

    resolveInit: () => {
      initPersistentObjects();
      chan?.setInterrupt(Module._Rf_onintr);
      Module.setValue(Module._R_Interactive, _config.interactive, '*');
      evalR(`options(webr_pkg_repos="${_config.repoUrl}")`);
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

  Module.print = (text: string) => {
    chan?.write({ type: 'stdout', data: text });
  };
  Module.printErr = (text: string) => {
    chan?.write({ type: 'stderr', data: text });
  };
  Module.setPrompt = (prompt: string) => {
    chan?.write({ type: 'prompt', data: prompt });
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (globalThis as any).Module = Module;

  // At the next tick, launch the REPL. This never returns.
  setTimeout(() => {
    const scriptSrc = `${_config.baseUrl}R.bin.js`;
    loadScript(scriptSrc);
  });
}
