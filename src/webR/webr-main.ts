import { newChannelMain, ChannelMain, ChannelType } from './chan/channel';
import { Message } from './chan/message';
import { BASE_URL, PKG_BASE_URL } from './config';
import { newRProxy, newRObjClassProxy } from './proxy';
import { WebRPayload } from './payload';
import { isRObject, RCharacter, RComplex, RDouble, REnvironment, RInteger } from './robj-main';
import { RList, RLogical, RNull, RObject, RPairlist, RRaw, RString } from './robj-main';
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
    const ch = (this.#chan = newChannelMain(config));

    this.RObject = newRObjClassProxy<typeof RWorker.RObject, RObject>(ch, 'object');
    this.RLogical = newRObjClassProxy<typeof RWorker.RLogical, RLogical>(ch, 'logical');
    this.RInteger = newRObjClassProxy<typeof RWorker.RInteger, RInteger>(ch, 'integer');
    this.RDouble = newRObjClassProxy<typeof RWorker.RDouble, RDouble>(ch, 'double');
    this.RComplex = newRObjClassProxy<typeof RWorker.RComplex, RComplex>(ch, 'complex');
    this.RCharacter = newRObjClassProxy<typeof RWorker.RCharacter, RCharacter>(ch, 'character');
    this.RRaw = newRObjClassProxy<typeof RWorker.RRaw, RRaw>(ch, 'raw');
    this.RList = newRObjClassProxy<typeof RWorker.RList, RList>(ch, 'list');
    this.RPairlist = newRObjClassProxy<typeof RWorker.RPairlist, RPairlist>(ch, 'pairlist');
    this.REnvironment = newRObjClassProxy<typeof RWorker.REnvironment, REnvironment>(
      ch,
      'environment'
    );
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
  async putFileData(name: string, data: Uint8Array) {
    const msg = { type: 'putFileData', data: { name: name, data: data } };
    return await this.#chan.request(msg);
  }
  async getFileData(name: string): Promise<Uint8Array> {
    return (await this.#chan.request({ type: 'getFileData', data: { name: name } })) as Uint8Array;
  }
  async getFSNode(path: string): Promise<FSNode> {
    return (await this.#chan.request({ type: 'getFSNode', data: { path: path } })) as FSNode;
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

    const payload = (await this.#chan.request({
      type: 'captureR',
      data: {
        code: code,
        env: env?._payload,
        options: options,
      },
    })) as WebRPayload;

    switch (payload.payloadType) {
      case 'raw':
        throw new Error('Unexpected raw payload type returned from evalR');
      case 'err': {
        const e = new Error(payload.obj.message);
        e.name = payload.obj.name;
        e.stack = payload.obj.stack;
        throw e;
      }
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

    const payload = (await this.#chan.request({
      type: 'evalR',
      data: { code: code, env: env?._payload },
    })) as WebRPayload;

    switch (payload.payloadType) {
      case 'raw':
        throw new Error('Unexpected raw payload type returned from evalR');
      case 'err': {
        const e = new Error(payload.obj.message);
        e.name = payload.obj.name;
        e.stack = payload.obj.stack;
        throw e;
      }
      default: {
        return newRProxy(this.#chan, payload);
      }
    }
  }
}
