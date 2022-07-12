import { BASE_URL, PKG_BASE_URL } from './config';
import { loadScript } from './compat';
import { ChannelWorker } from './chan/channel';
import { Message, Request, newResponse } from './chan/message';
import { ImplicitTypes, RProxy, wrapRSexp } from './sexp';
import { FSNode, WebROptions, Module, XHRResponse, Rptr, RProxyResponse, RCallInfo } from './utils';

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
          case 'evalRCode': {
            write(evalRCode(reqMsg.data.code as string));
            continue;
          }
          case 'proxyProp': {
            write(proxyProp(reqMsg.data.ptr as Rptr, reqMsg.data.prop as keyof RProxy));
            continue;
          }
          case 'proxyCall': {
            write(proxyCall(reqMsg.data.ptr as Rptr, reqMsg.data.callList as Array<RCallInfo>));
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

function buildRProxyResponse(ptr: Rptr, res: RProxy | ImplicitTypes | Function): RProxyResponse {
  if (typeof res === 'function') {
    // Inform the main thread the result is a function
    return { obj: ptr, converted: false, function: true };
  } else if (typeof res !== 'object') {
    // Return a primitive value
    return { obj: res, converted: true };
  } else if ('convertImplicitly' in res) {
    // This is an RProxy object, convert it if required then return
    return { obj: res.convertImplicitly ? res.toJs() : res.ptr, converted: res.convertImplicitly };
  } else {
    // Not a RProxy object, return it directly
    return { obj: res, converted: true };
  }
}

function proxyCall(ptr: Rptr, callList: Array<RCallInfo>): RProxyResponse {
  const rSexp = wrapRSexp(ptr);
  let r: RProxy | ImplicitTypes | Function = rSexp;
  let callInfo = undefined;
  while ((callInfo = callList.shift())) {
    if (callInfo.name === '_call') {
      if (typeof r === 'function') {
        // Call the function directly
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        r = r(...callInfo.args);
      } else if (typeof r === 'object' && '_call' in r) {
        // This is an RProxy object, so run the _call method
        r = r._call(callInfo.args);
      }
    } else if (typeof callInfo.name === 'string' && typeof r === 'object' && '_call' in r) {
      /* The next requested method in the call list is a property of an
         RProxy object, so grab the property and then execute it.
      */
      r = (
        r[callInfo.name as keyof RProxy] as (...a: Array<any>) => RProxy | ImplicitTypes | Function
      )(...callInfo.args);
    } else {
      throw new Error(
        `An error occured executing the call list for RProxy object: ${rSexp.toString()}`
      );
    }
  }
  return buildRProxyResponse(ptr, r);
}

function proxyProp(ptr: Rptr, prop: keyof RProxy): RProxyResponse {
  const rSexp = wrapRSexp(ptr);
  if (prop in rSexp) {
    const r = rSexp[prop];
    return buildRProxyResponse(ptr, r);
  }
  return { obj: undefined, converted: true };
}

function evalRCode(code: string): RProxyResponse {
  const str = allocateUTF8(code);
  const err = allocate(1, 'i32', 0);
  const resultptr = Module._evalRCode(str, err);
  const errValue = getValue(err, 'i32');
  if (errValue) {
    throw Error(`An error occured evaluating R code (${errValue})`);
  }
  Module._free(str);
  Module._free(err);
  const rSexp = wrapRSexp(resultptr);
  if (rSexp.convertImplicitly) {
    return { obj: rSexp.toJs(), converted: rSexp.convertImplicitly };
  }
  return { obj: resultptr, converted: rSexp.convertImplicitly };
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
