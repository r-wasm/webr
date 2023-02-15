/**
 * The webR JavaScript API.
 * @module WebR
 */

import { ChannelMain } from './chan/channel';
import { newChannelMain, ChannelType } from './chan/channel-common';
import { Message } from './chan/message';
import { BASE_URL, PKG_BASE_URL } from './config';
import { EmPtr } from './emscripten';
import { WebRPayloadPtr } from './payload';
import { newRProxy, newRClassProxy } from './proxy';
import { isRObject, RCharacter, RComplex, RDouble } from './robj-main';
import { REnvironment, RSymbol, RInteger } from './robj-main';
import { RList, RLogical, RNull, RObject, RPairlist, RRaw, RString, RCall } from './robj-main';
import { replaceInObject } from './utils';
import * as RWorker from './robj-worker';

import {
  CaptureRMessage,
  EvalRMessage,
  EvalRMessageOutputType,
  EvalRMessageRaw,
  EvalROptions,
  FSMessage,
  FSReadFileMessage,
  FSWriteFileMessage,
  InvokeWasmFunctionMessage,
  NewShelterMessage,
  ShelterDestroyMessage,
  ShelterMessage,
} from './webr-chan';

export { Console, ConsoleCallbacks } from '../console/console';

/**
 * The webR FS API for interacting with the Emscripten Virtual File System.
 */
export interface WebRFS {
  /**
   * Lookup information about a file or directory node in the Emscripten
   * virtual file system.
   * @param {string} path Path to the requested node.
   * @returns {Promise<FSNode>} The requested node.
   */
  lookupPath: (path: string) => Promise<FSNode>;
  /**
   * Create a directory on the Emscripten virtual file system.
   * @param {string} path Path of the directory to create.
   * @returns {Promise<FSNode>} The newly created directory node.
   */
  mkdir: (path: string) => Promise<FSNode>;
  /**
   * Get the content of a file on the Emscripten virtual file system.
   * @param {string} path Path of the file to read.
   * @param {string} [flags] Open the file with the specified flags.
   * @returns {Promise<Uint8Array>} The content of the requested file.
   */
  readFile: (path: string, flags?: string) => Promise<Uint8Array>;
  /**
   * Remove a directory on the Emscripten virtual file system.
   * @param {string} path Path of the directory to remove.
   */
  rmdir: (path: string) => Promise<void>;
  /**
   * Write a new file to the Emscripten virtual file system.
   * @param {string} path Path of the new file.
   * @param {Uint8Array} data The content of the new file.
   * @param {string} [flags] Open the file with the specified flags.
   */
  writeFile: (path: string, data: ArrayBufferView, flags?: string) => Promise<void>;
  /**
   * Unlink a node on the Emscripten virtual file system. If that node was the
   * last link to a file it is is deleted.
   * @param {string} path Path of the target node.
   */
  unlink: (path: string) => Promise<void>;
}

/** A filesystem entry in the Emscripten Virtual File System */
export type FSNode = {
  id: number;
  name: string;
  mode: number;
  isFolder: boolean;
  contents: { [key: string]: FSNode };
};

/**
 * The configuration settings to be used when starting webR.
 */
export interface WebROptions {
  /**
   * Command line arguments to be passed to R.
   * Default: `[]`.
   */
  RArgs?: string[];

  /**
   * Environment variables to be made available for the R process.
   * Default: `{ R_HOME: '/usr/lib/R', R_ENABLE_JIT: 0 }`.
   */
  REnv?: { [key: string]: string };

  /**
   * The base URL used for downloading R WebAssembly binaries.
   *  Default: `'https://webr.r-wasm.org/[version]/'`
   */
  baseUrl?: string;

  /**
   * The repo URL to use when downloading R WebAssembly packages.
   * Default: `'https://repo.r-wasm.org/`
   */
  repoUrl?: string;

  /**
   * The base URL from where to load JavaScript worker scripts when loading
   * webR with the ServiceWorker communication channel mode.
   * Default: `''`
   */
  serviceWorkerUrl?: string;

  /**
   * The WebAssembly user's home directory and initial working directory.
   * Default: `'/home/web_user'`
   */
  homedir?: string;

  /**
   * Start R in interactive mode?
   * Default: `true`.
   */
  interactive?: boolean;

  /**
   * Set the communication channel type to be used.
   * Default: `channelType.Automatic`
   */
  channelType?: (typeof ChannelType)[keyof typeof ChannelType];
}

const defaultEnv = {
  R_HOME: '/usr/lib/R',
  R_ENABLE_JIT: '0',
};

const defaultOptions = {
  RArgs: [],
  REnv: defaultEnv,
  baseUrl: BASE_URL,
  serviceWorkerUrl: '',
  repoUrl: PKG_BASE_URL,
  homedir: '/home/web_user',
  interactive: true,
  channelType: ChannelType.Automatic,
};

/**
 * The webR class is used to initialize and interact with the webR system.
 *
 * Start webR by constructing an instance of the WebR class, optionally passing
 * an options argument of type {@link WebROptions}. WebR will begin to download
 * and start a version of R built for WebAssembly in a worker thread.
 */
export class WebR {
  #chan!: ChannelMain;
  globalShelter!: Shelter;

  RObject!: ReturnType<typeof newRClassProxy<typeof RWorker.RObject, RObject>>;
  RLogical!: ReturnType<typeof newRClassProxy<typeof RWorker.RLogical, RLogical>>;
  RInteger!: ReturnType<typeof newRClassProxy<typeof RWorker.RInteger, RInteger>>;
  RDouble!: ReturnType<typeof newRClassProxy<typeof RWorker.RDouble, RDouble>>;
  RCharacter!: ReturnType<typeof newRClassProxy<typeof RWorker.RCharacter, RCharacter>>;
  RComplex!: ReturnType<typeof newRClassProxy<typeof RWorker.RComplex, RComplex>>;
  RRaw!: ReturnType<typeof newRClassProxy<typeof RWorker.RRaw, RRaw>>;
  RList!: ReturnType<typeof newRClassProxy<typeof RWorker.RList, RList>>;
  RPairlist!: ReturnType<typeof newRClassProxy<typeof RWorker.RPairlist, RPairlist>>;
  REnvironment!: ReturnType<typeof newRClassProxy<typeof RWorker.REnvironment, REnvironment>>;
  RSymbol!: ReturnType<typeof newRClassProxy<typeof RWorker.RSymbol, RSymbol>>;
  RString!: ReturnType<typeof newRClassProxy<typeof RWorker.RString, RString>>;
  RCall!: ReturnType<typeof newRClassProxy<typeof RWorker.RCall, RCall>>;

  objs: {
    baseEnv: REnvironment;
    globalEnv: REnvironment;
    null: RNull;
    true: RLogical;
    false: RLogical;
    na: RLogical;
  };

  Shelter;

  constructor(options: WebROptions = {}) {
    const config: Required<WebROptions> = Object.assign(defaultOptions, options);
    this.#chan = newChannelMain(config);

    this.objs = {} as typeof this.objs;
    this.Shelter = newShelterProxy(this.#chan);
  }

  /**
   * @returns {Promise<void>} A promise that resolves once webR has been
   * intialised.
   */
  async init() {
    const init = await this.#chan.initialised;

    this.globalShelter = await new this.Shelter();

    this.RObject = this.globalShelter.RObject;
    this.RLogical = this.globalShelter.RLogical;
    this.RInteger = this.globalShelter.RInteger;
    this.RDouble = this.globalShelter.RDouble;
    this.RComplex = this.globalShelter.RComplex;
    this.RCharacter = this.globalShelter.RCharacter;
    this.RRaw = this.globalShelter.RRaw;
    this.RList = this.globalShelter.RList;
    this.RPairlist = this.globalShelter.RPairlist;
    this.REnvironment = this.globalShelter.REnvironment;
    this.RSymbol = this.globalShelter.RSymbol;
    this.RString = this.globalShelter.RString;
    this.RCall = this.globalShelter.RCall;

    this.objs = {
      baseEnv: (await this.RObject.getPersistentObject('baseEnv')) as REnvironment,
      globalEnv: (await this.RObject.getPersistentObject('globalEnv')) as REnvironment,
      null: (await this.RObject.getPersistentObject('null')) as RNull,
      true: (await this.RObject.getPersistentObject('true')) as RLogical,
      false: (await this.RObject.getPersistentObject('false')) as RLogical,
      na: (await this.RObject.getPersistentObject('na')) as RLogical,
    };

    return init;
  }

  /**
   * Close the communication channel between the main thread and the worker
   * thread cleanly. Once this has been executed, webR will be unable to
   * continue.
   */
  close() {
    this.#chan.close();
  }

  /**
   * Read from the communication channel and return an output message.
   * @returns {Promise<Message>} The output message
   */
  async read(): Promise<Message> {
    let msg = await this.#chan.read();

    /* Handle any output messages requesting a delayed invocation of a wasm
     * function. Otherwise, return messages to the application.
     * TODO: Reimplement without using the main thread once it is possible to
     *       yield in the worker thread.
     */
    while (msg.type === 'setTimeoutWasm') {
      setTimeout(
        (ptr: EmPtr, args: number[]) => {
          this.invokeWasmFunction(ptr, ...args);
        },
        msg.data.delay as number,
        msg.data.ptr,
        msg.data.args
      );
      msg = await this.#chan.read();
    }

    return msg;
  }

  /**
   * Flush the output queue in the communication channel and return all output
   * messages.
   * @returns {Promise<Message[]>} The output messages
   */
  async flush(): Promise<Message[]> {
    return await this.#chan.flush();
  }

  /**
   * Send a message to the communication channel input queue.
   * @param {Message} msg Message to be added to the input queue.
   */
  write(msg: Message) {
    this.#chan.write(msg);
  }

  /**
   * Send a line of standard input to the communication channel input queue.
   * @param {string} input Message to be added to the input queue.
   */
  writeConsole(input: string) {
    this.write({ type: 'stdin', data: input + '\n' });
  }

  /** Attempt to interrupt a running R computation. */
  interrupt() {
    this.#chan.interrupt();
  }

  /**
   * Install a list of R packages from the default webR CRAN-like repo.
   * @param {string[]} packages An array of R pacakge names.
   */
  async installPackages(packages: string[]) {
    for (const pkg of packages) {
      const msg = { type: 'installPackage', data: { name: pkg } };
      await this.#chan.request(msg);
    }
  }

  /**
   * Destroy an R object reference.
   * @param {RObject} x An R object reference.
   */
  async destroy(x: RObject) {
    await this.globalShelter.destroy(x);
  }

  /**
   * Evaluate the given R code.
   *
   * Stream outputs and any conditions raised during exectution are written to
   * the JavaScript console.
   *
   * @param {string} code The R code to evaluate.
   * @param {EvalROptions} [options] Options for the execution environment.
   * @returns {Promise<RObject>} The result of the computation.
   */
  async evalR(code: string, options?: EvalROptions): Promise<RObject> {
    return this.globalShelter.evalR(code, options);
  }

  async evalRVoid(code: string, options?: EvalROptions) {
    return this.evalRRaw(code, 'void', options);
  }

  async evalRBoolean(code: string, options?: EvalROptions) {
    return this.evalRRaw(code, 'boolean', options);
  }

  async evalRNumber(code: string, options?: EvalROptions) {
    return this.evalRRaw(code, 'number', options);
  }

  async evalRString(code: string, options?: EvalROptions) {
    return this.evalRRaw(code, 'string', options);
  }

  /**
   * Evaluate the given R code, returning the result as a raw JavaScript object.
   *
   * @param {string} code The R code to evaluate.
   * @param {EvalRMessageOutputType} outputType JavaScript type to return the result as.
   * @param {EvalROptions} [options] Options for the execution environment.
   * @returns {Promise<unknown>} The result of the computation.
   */
  async evalRRaw(code: string, outputType: 'void', options?: EvalROptions): Promise<void>;
  async evalRRaw(code: string, outputType: 'boolean', options?: EvalROptions): Promise<boolean>;
  async evalRRaw(code: string, outputType: 'boolean[]', options?: EvalROptions): Promise<boolean[]>;
  async evalRRaw(code: string, outputType: 'number', options?: EvalROptions): Promise<number>;
  async evalRRaw(code: string, outputType: 'number[]', options?: EvalROptions): Promise<number[]>;
  async evalRRaw(code: string, outputType: 'string', options?: EvalROptions): Promise<string>;
  async evalRRaw(code: string, outputType: 'string[]', options?: EvalROptions): Promise<string[]>;
  async evalRRaw(code: string, outputType: EvalRMessageOutputType, options: EvalROptions = {}) {
    const opts = replaceInObject(options, isRObject, (obj: RObject) => obj._payload);
    const msg: EvalRMessageRaw = {
      type: 'evalRRaw',
      data: { code: code, options: opts as EvalROptions, outputType: outputType },
    };
    const payload = await this.#chan.request(msg);

    switch (payload.payloadType) {
      case 'raw':
        return payload.obj;
      case 'ptr':
        throw new Error('Unexpected ptr payload type returned from evalRVoid');
    }
  }

  async invokeWasmFunction(ptr: EmPtr, ...args: number[]): Promise<EmPtr> {
    const msg = {
      type: 'invokeWasmFunction',
      data: { ptr, args },
    } as InvokeWasmFunctionMessage;
    const resp = await this.#chan.request(msg);
    return resp.obj as EmPtr;
  }

  FS = {
    lookupPath: async (path: string): Promise<FSNode> => {
      const msg: FSMessage = { type: 'lookupPath', data: { path } };
      const payload = await this.#chan.request(msg);
      return payload.obj as FSNode;
    },
    mkdir: async (path: string): Promise<FSNode> => {
      const msg: FSMessage = { type: 'mkdir', data: { path } };
      const payload = await this.#chan.request(msg);
      return payload.obj as FSNode;
    },
    readFile: async (path: string, flags?: string): Promise<Uint8Array> => {
      const msg: FSReadFileMessage = { type: 'readFile', data: { path, flags } };
      const payload = await this.#chan.request(msg);
      return payload.obj as Uint8Array;
    },
    rmdir: async (path: string): Promise<void> => {
      const msg: FSMessage = { type: 'rmdir', data: { path } };
      await this.#chan.request(msg);
    },
    writeFile: async (path: string, data: ArrayBufferView, flags?: string): Promise<void> => {
      const msg: FSWriteFileMessage = { type: 'writeFile', data: { path, data, flags } };
      await this.#chan.request(msg);
    },
    unlink: async (path: string): Promise<void> => {
      const msg: FSMessage = { type: 'unlink', data: { path } };
      await this.#chan.request(msg);
    },
  };
}

/** WebR shelters provide fine-grained control over the lifetime of R objects. */
export class Shelter {
  #id = '';
  #chan: ChannelMain;
  #initialised = false;

  RObject!: ReturnType<typeof newRClassProxy<typeof RWorker.RObject, RObject>>;
  RLogical!: ReturnType<typeof newRClassProxy<typeof RWorker.RLogical, RLogical>>;
  RInteger!: ReturnType<typeof newRClassProxy<typeof RWorker.RInteger, RInteger>>;
  RDouble!: ReturnType<typeof newRClassProxy<typeof RWorker.RDouble, RDouble>>;
  RCharacter!: ReturnType<typeof newRClassProxy<typeof RWorker.RCharacter, RCharacter>>;
  RComplex!: ReturnType<typeof newRClassProxy<typeof RWorker.RComplex, RComplex>>;
  RRaw!: ReturnType<typeof newRClassProxy<typeof RWorker.RRaw, RRaw>>;
  RList!: ReturnType<typeof newRClassProxy<typeof RWorker.RList, RList>>;
  RPairlist!: ReturnType<typeof newRClassProxy<typeof RWorker.RPairlist, RPairlist>>;
  REnvironment!: ReturnType<typeof newRClassProxy<typeof RWorker.REnvironment, REnvironment>>;
  RSymbol!: ReturnType<typeof newRClassProxy<typeof RWorker.RSymbol, RSymbol>>;
  RString!: ReturnType<typeof newRClassProxy<typeof RWorker.RString, RString>>;
  RCall!: ReturnType<typeof newRClassProxy<typeof RWorker.RCall, RCall>>;

  /** @internal */
  constructor(chan: ChannelMain) {
    this.#chan = chan;
  }

  /** @internal */
  async init() {
    if (this.#initialised) {
      return;
    }

    const msg = { type: 'newShelter' } as NewShelterMessage;
    const payload = await this.#chan.request(msg);
    this.#id = payload.obj as string;

    this.RObject = newRClassProxy<typeof RWorker.RObject, RObject>(this.#chan, this.#id, 'object');
    this.RLogical = newRClassProxy<typeof RWorker.RLogical, RLogical>(this.#chan, this.#id, 'logical');
    this.RInteger = newRClassProxy<typeof RWorker.RInteger, RInteger>(this.#chan, this.#id, 'integer');
    this.RDouble = newRClassProxy<typeof RWorker.RDouble, RDouble>(this.#chan, this.#id, 'double');
    this.RComplex = newRClassProxy<typeof RWorker.RComplex, RComplex>(this.#chan, this.#id, 'complex');
    this.RCharacter = newRClassProxy<typeof RWorker.RCharacter, RCharacter>(this.#chan, this.#id, 'character');
    this.RRaw = newRClassProxy<typeof RWorker.RRaw, RRaw>(this.#chan, this.#id, 'raw');
    this.RList = newRClassProxy<typeof RWorker.RList, RList>(this.#chan, this.#id, 'list');
    this.RPairlist = newRClassProxy<typeof RWorker.RPairlist, RPairlist>(this.#chan, this.#id, 'pairlist');
    this.REnvironment = newRClassProxy<typeof RWorker.REnvironment, REnvironment>(this.#chan, this.#id, 'environment');
    this.RSymbol = newRClassProxy<typeof RWorker.RSymbol, RSymbol>(this.#chan, this.#id, 'symbol');
    this.RString = newRClassProxy<typeof RWorker.RString, RString>(this.#chan, this.#id, 'string');
    this.RCall = newRClassProxy<typeof RWorker.RCall, RCall>(this.#chan, this.#id, 'call');

    this.#initialised = true;
  }

  async purge() {
    const msg: ShelterMessage = {
      type: 'shelterPurge',
      data: this.#id,
    };
    await this.#chan.request(msg);
  }

  async destroy(x: RObject) {
    const msg: ShelterDestroyMessage = {
      type: 'shelterDestroy',
      data: { id: this.#id, obj: x._payload },
    };
    await this.#chan.request(msg);
  }

  async size(): Promise<number> {
    const msg: ShelterMessage = {
      type: 'shelterSize',
      data: this.#id,
    };
    const payload = await this.#chan.request(msg);
    return payload.obj as number;
  }

  /**
   * Evaluate the given R code.
   *
   * Stream outputs and any conditions raised during exectution are written to
   * the JavaScript console. The returned R object is protected by the shelter.
   *
   * @param {string} code The R code to evaluate.
   * @param {EvalROptions} [options] Options for the execution environment.
   * @returns {Promise<RObject>} The result of the computation.
   */
  async evalR(code: string, options: EvalROptions = {}): Promise<RObject> {
    const opts = replaceInObject(options, isRObject, (obj: RObject) => obj._payload);
    const msg: EvalRMessage = {
      type: 'evalR',
      data: { code: code, options: opts as EvalROptions, shelter: this.#id },
    };
    const payload = await this.#chan.request(msg);

    switch (payload.payloadType) {
      case 'raw':
        throw new Error('Unexpected payload type returned from evalR');
      default:
        return newRProxy(this.#chan, payload);
    }
  }

  /**
   * Evaluate the given R code, capturing output.
   *
   * Stream outputs and conditions raised during exectution are captured and
   * returned as part of the output of this function. Returned R objects are
   * protected by the shelter.
   *
   * @param {string} code The R code to evaluate.
   * @param {EvalROptions} [options] Options for the execution environment.
   * @returns {Promise<{result: RObject, output: unknown[]}>} An object
   * containing the result of the computation and and array of captured output.
   */
  async captureR(code: string, options: EvalROptions = {}): Promise<{
    result: RObject;
    output: unknown[];
  }> {
    const opts = replaceInObject(options, isRObject, (obj: RObject) => obj._payload);
    const msg: CaptureRMessage = {
      type: 'captureR',
      data: {
        code: code,
        options: opts as EvalROptions,
        shelter: this.#id,
      },
    };
    const payload = await this.#chan.request(msg);

    switch (payload.payloadType) {
      case 'ptr':
        throw new Error('Unexpected payload type returned from evalR');

      case 'raw': {
        const data = payload.obj as {
          result: WebRPayloadPtr;
          output: { type: string; data: any }[];
        };
        const result = newRProxy(this.#chan, data.result);
        const output = data.output;

        for (let i = 0; i < output.length; ++i) {
          if (output[i].type !== 'stdout' && output[i].type !== 'stderr') {
            output[i].data = newRProxy(this.#chan, output[i].data as WebRPayloadPtr);
          }
        }

        return { result, output };
      }
    }
  }
}

function newShelterProxy(chan: ChannelMain) {
  return new Proxy(Shelter, {
    construct: async () => {
      const out = new Shelter(chan);
      await out.init();
      return out;
    },
  }) as unknown as {
    new (): Promise<Shelter>;
  };
}
