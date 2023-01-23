import { newChannelMain, ChannelMain, ChannelType } from './chan/channel';
import { Message } from './chan/message';
import { BASE_URL, PKG_BASE_URL } from './config';
import { webRPayloadError } from './payload';
import { newRProxy, newRClassProxy } from './proxy';
import { isRObject, RCharacter, RComplex, RDouble } from './robj-main';
import { REnvironment, RSymbol, RInteger } from './robj-main';
import { RList, RLogical, RNull, RObject, RPairlist, RRaw, RString, RCall } from './robj-main';
import * as RWorker from './robj-worker';

export type CaptureROptions = {
  captureStreams?: boolean;
  captureConditions?: boolean;
  withAutoprint?: boolean;
  throwJsException?: boolean;
  withHandlers?: boolean;
};

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

    const payload = await this.#chan.request({
      type: 'captureR',
      data: {
        code: code,
        env: env?._payload,
        options: options,
      },
    });

    switch (payload.payloadType) {
      case 'raw':
        throw new Error('Unexpected raw payload type returned from evalR');
      case 'err':
        throw webRPayloadError(payload);
      default: {
        const obj = newRProxy(this.#chan, payload);
        obj.preserve();
        const result = await obj.get(1);
        const outList = (await obj.get(2)) as RList;
        const output: any[] = [];
        for await (const out of outList) {
          const type = await ((await out.pluck(1, 1)) as RCharacter).toString();
          const data = await out.get(2);
          if (type === 'stdout' || type === 'stderr') {
            output.push({ type, data: await (data as RString).toString() });
          } else {
            output.push({ type, data });
          }
        }
        obj.release();
        return { result, output };
      }
    }
  }

  async evalR(code: string, env?: REnvironment): Promise<RObject> {
    if (env && !isRObject(env)) {
      throw new Error('Attempted to evaluate R code with invalid environment object');
    }

    const payload = await this.#chan.request({
      type: 'evalR',
      data: { code: code, env: env?._payload },
    });

    switch (payload.payloadType) {
      case 'raw':
        throw new Error('Unexpected raw payload type returned from evalR');
      case 'err':
        throw webRPayloadError(payload);
      default:
        return newRProxy(this.#chan, payload);
    }
  }

  FS = {
    lookupPath: async (path: string): Promise<FSNode> => {
      const payload = await this.#chan.request({ type: 'lookupPath', data: { path } });
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
      return payload.obj as FSNode;
    },
    mkdir: async (path: string): Promise<FSNode> => {
      const payload = await this.#chan.request({ type: 'mkdir', data: { path } });
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
      return payload.obj as FSNode;
    },
    readFile: async (path: string, flags?: string): Promise<Uint8Array> => {
      const payload = await this.#chan.request({ type: 'readFile', data: { path, flags } });
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
      return payload.obj as Uint8Array;
    },
    rmdir: async (path: string): Promise<void> => {
      const payload = await this.#chan.request({ type: 'rmdir', data: { path } });
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
    },
    writeFile: async (path: string, data: ArrayBufferView, flags?: string): Promise<void> => {
      const payload = await this.#chan.request({ type: 'writeFile', data: { path, data, flags } });
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
    },
    unlink: async (path: string): Promise<void> => {
      const payload = await this.#chan.request({ type: 'unlink', data: { path } });
      if (payload.payloadType === 'err') {
        throw webRPayloadError(payload);
      }
    },
  };
}
