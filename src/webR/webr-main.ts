import { newChannelMain, ChannelMain, ChannelType } from './chan/channel';
import { Message } from './chan/message';
import { BASE_URL, PKG_BASE_URL } from './config';
import { WebRPayloadPtr, webRPayloadError } from './payload';
import { newRProxy, newRClassProxy } from './proxy';
import { isRObject, RCharacter, RComplex, RDouble } from './robj-main';
import { REnvironment, RSymbol, RInteger } from './robj-main';
import { RList, RLogical, RNull, RObject, RPairlist, RRaw, RString, RCall } from './robj-main';
import * as RWorker from './robj-worker';

import {
  CaptureRMessage,
  CaptureROptions,
  EvalRMessage,
  FSMessage,
  FSReadFileMessage,
  FSWriteFileMessage,
  NewShelterMessage,
  ShelterMessage,
  ShelterDestroyMessage,
} from './webr-chan';

export { Console, ConsoleCallbacks } from '../console/console';

export type FSNode = {
  id: number;
  name: string;
  mode: number;
  isFolder: boolean;
  contents: { [key: string]: FSNode };
};

export interface WebROptions {
  RArgs?: string[];
  REnv?: { [key: string]: string };
  WEBR_URL?: string;
  PKG_URL?: string;
  SW_URL?: string;
  homedir?: string;
  interactive?: boolean;
  channelType?: typeof ChannelType[keyof typeof ChannelType];
}

const defaultEnv = {
  R_HOME: '/usr/lib/R',
  R_ENABLE_JIT: '0',
};

const defaultOptions = {
  RArgs: [],
  REnv: defaultEnv,
  WEBR_URL: BASE_URL,
  SW_URL: '',
  PKG_URL: PKG_BASE_URL,
  homedir: '/home/web_user',
  interactive: true,
  channelType: ChannelType.Automatic,
};

export class WebR {
  #chan: ChannelMain;
  globalShelter!: Shelter;

  RObject;
  RLogical;
  RInteger;
  RDouble;
  RCharacter;
  RComplex;
  RRaw;
  RList;
  RPairlist;
  REnvironment;
  RSymbol;
  RString;
  RCall;
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
    const c = (this.#chan = newChannelMain(config));

    this.RObject = newRClassProxy<typeof RWorker.RObject, RObject>(c, 'object');
    this.RLogical = newRClassProxy<typeof RWorker.RLogical, RLogical>(c, 'logical');
    this.RInteger = newRClassProxy<typeof RWorker.RInteger, RInteger>(c, 'integer');
    this.RDouble = newRClassProxy<typeof RWorker.RDouble, RDouble>(c, 'double');
    this.RComplex = newRClassProxy<typeof RWorker.RComplex, RComplex>(c, 'complex');
    this.RCharacter = newRClassProxy<typeof RWorker.RCharacter, RCharacter>(c, 'character');
    this.RRaw = newRClassProxy<typeof RWorker.RRaw, RRaw>(c, 'raw');
    this.RList = newRClassProxy<typeof RWorker.RList, RList>(c, 'list');
    this.RPairlist = newRClassProxy<typeof RWorker.RPairlist, RPairlist>(c, 'pairlist');
    this.REnvironment = newRClassProxy<typeof RWorker.REnvironment, REnvironment>(c, 'environment');
    this.RSymbol = newRClassProxy<typeof RWorker.RSymbol, RSymbol>(c, 'symbol');
    this.RString = newRClassProxy<typeof RWorker.RString, RString>(c, 'string');
    this.RCall = newRClassProxy<typeof RWorker.RCall, RCall>(c, 'call');
    this.objs = {} as typeof this.objs;

    this.Shelter = newShelterProxy(this.#chan);
  }

  async init() {
    const init = await this.#chan.initialised;

    this.objs = {
      baseEnv: (await this.RObject.getStaticPropertyValue('baseEnv')) as REnvironment,
      globalEnv: (await this.RObject.getStaticPropertyValue('globalEnv')) as REnvironment,
      null: (await this.RObject.getStaticPropertyValue('null')) as RNull,
      true: (await this.RObject.getStaticPropertyValue('true')) as RLogical,
      false: (await this.RObject.getStaticPropertyValue('false')) as RLogical,
      na: (await this.RObject.getStaticPropertyValue('logicalNA')) as RLogical,
    };

    this.globalShelter = await new this.Shelter();

    return init;
  }

  close() {
    return this.#chan.close();
  }

  async read(): Promise<Message> {
    return await this.#chan.read();
  }

  async flush(): Promise<Message[]> {
    return await this.#chan.flush();
  }

  write(msg: Message) {
    this.#chan.write(msg);
  }
  writeConsole(input: string) {
    this.write({ type: 'stdin', data: input + '\n' });
  }

  interrupt() {
    this.#chan.interrupt();
  }

  async installPackages(packages: string[]) {
    for (const pkg of packages) {
      const msg = { type: 'installPackage', data: { name: pkg } };
      await this.#chan.request(msg);
    }
  }

  async destroy(x: RObject) {
    await this.globalShelter.destroy(x);
  }

  async captureR(
    code: string,
    env?: REnvironment,
    options: CaptureROptions = {}
  ): Promise<{
    result: RObject;
    output: unknown[];
  }> {
    return this.globalShelter.captureR(code, env, options);
  }

  async evalR(code: string, env?: REnvironment): Promise<RObject> {
    return this.globalShelter.evalR(code, env);
  }

  FS = {
    lookupPath: async (path: string): Promise<FSNode> => {
      const msg: FSMessage = { type: 'lookupPath', data: { path } };
      const payload = await this.#chan.request(msg);
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
      return payload.obj as FSNode;
    },
    mkdir: async (path: string): Promise<FSNode> => {
      const msg: FSMessage = { type: 'mkdir', data: { path } };
      const payload = await this.#chan.request(msg);
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
      return payload.obj as FSNode;
    },
    readFile: async (path: string, flags?: string): Promise<Uint8Array> => {
      const msg: FSReadFileMessage = { type: 'readFile', data: { path, flags } };
      const payload = await this.#chan.request(msg);
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
      return payload.obj as Uint8Array;
    },
    rmdir: async (path: string): Promise<void> => {
      const msg: FSMessage = { type: 'rmdir', data: { path } };
      const payload = await this.#chan.request(msg);
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
    },
    writeFile: async (path: string, data: ArrayBufferView, flags?: string): Promise<void> => {
      const msg: FSWriteFileMessage = { type: 'writeFile', data: { path, data, flags } };
      const payload = await this.#chan.request(msg);
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
    },
    unlink: async (path: string): Promise<void> => {
      const msg: FSMessage = { type: 'unlink', data: { path } };
      const payload = await this.#chan.request(msg);
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
    },
  };
}

export class Shelter {
  #id = '';
  #chan: ChannelMain;
  #initialised = false;

  constructor(chan: ChannelMain) {
    this.#chan = chan;
  }

  async init() {
    if (this.#initialised) {
      return;
    }

    const msg = { type: 'newShelter' } as NewShelterMessage;
    const payload = await this.#chan.request(msg);
    this.#id = payload.obj as string;
    this.#initialised = true;
  }

  async purge() {
    const msg: ShelterMessage = {
      type: 'shelterPurge',
      data: this.#id,
    };
    const payload = await this.#chan.request(msg);

    // FIXME: Should be thrown by the channel
    if (payload.payloadType === 'err') {
      throw webRPayloadError(payload);
    }
  }

  async destroy(x: RObject) {
    const msg: ShelterDestroyMessage = {
      type: 'shelterDestroy',
      data: { id: this.#id, obj: x._payload },
    };
    const payload = await this.#chan.request(msg);

    // FIXME: Should be thrown by the channel
    if (payload.payloadType === 'err') {
      throw webRPayloadError(payload);
    }
  }

  async size(): Promise<number> {
    const msg: ShelterMessage = {
      type: 'shelterSize',
      data: this.#id,
    };
    const payload = await this.#chan.request(msg);

    return payload.obj as number;
  }

  async evalR(code: string, env?: REnvironment): Promise<RObject> {
    if (env && !isRObject(env)) {
      throw new Error('Attempted to evaluate R code with invalid environment object');
    }

    const msg: EvalRMessage = {
      type: 'evalR',
      data: { code: code, env: env?._payload, shelter: this.#id },
    };
    const payload = await this.#chan.request(msg);

    switch (payload.payloadType) {
      case 'raw':
        throw new Error('Unexpected raw payload type returned from evalR');
      case 'err':
        throw webRPayloadError(payload);
      default:
        return newRProxy(this.#chan, payload);
    }
  }

  async captureR(
    code: string,
    env?: REnvironment,
    options: CaptureROptions = {}
  ): Promise<{
    result: RObject;
    output: unknown[];
  }> {
    if (env && !isRObject(env)) {
      throw new Error('Attempted to evaluate R code with invalid environment object');
    }

    const msg: CaptureRMessage = {
      type: 'captureR',
      data: {
        code: code,
        env: env?._payload,
        options: options,
        shelter: this.#id,
      },
    };
    const payload = await this.#chan.request(msg);

    switch (payload.payloadType) {
      case 'ptr':
        throw new Error('Unexpected ptr payload type returned from evalR');

      case 'err': {
        throw webRPayloadError(payload);
      }

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
