import { newChannelMain, ChannelMain, ChannelType } from './chan/channel';
import { Message } from './chan/message';
import { BASE_URL, PKG_BASE_URL } from './config';
import { newRProxy, DistProxy } from './proxy';
import { unpackScalarVectors, replaceInObject } from './utils';
import {
  RTargetObj,
  RObject,
  isRObject,
  RawType,
  RList,
  REnvironment,
  RCharacter,
  RObjData,
  RObjImpl,
} from './robj';

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

type RData = DistProxy<RObjData>;
export class WebR {
  #chan: ChannelMain;
  RObject;

  constructor(options: WebROptions = {}) {
    const config: Required<WebROptions> = Object.assign(defaultOptions, options);
    this.#chan = newChannelMain(config);

    this.RObject = this.#newRObjConstructor<RData | RData[], RObject>();
  }

  async init() {
    return await this.#chan.initialised;
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

    const target = (await this.#chan.request({
      type: 'captureR',
      data: {
        code: code,
        env: env?._target,
        options: options,
      },
    })) as RTargetObj;

    switch (target.targetType) {
      case 'raw':
        throw new Error('Unexpected raw target type returned from evalR');
      case 'err': {
        const e = new Error(target.obj.message);
        e.name = target.obj.name;
        e.stack = target.obj.stack;
        throw e;
      }
      default: {
        const obj = newRProxy(this.#chan, target);
        obj.preserve();
        const result = await obj.get(1);
        const outList = (await obj.get(2)) as RList;
        const output: any[] = [];
        for await (const out of outList) {
          const type = await ((await out.pluck(1, 1)) as RCharacter).toString();
          if (type === 'stdout' || type === 'stderr') {
            const obj = (await (out as RList).toObject({ depth: 0 })) as RawType;
            output.push(unpackScalarVectors(obj));
          } else {
            output.push({ type, data: await out.pluck(2) });
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

    const target = (await this.#chan.request({
      type: 'evalR',
      data: { code: code, env: env?._target },
    })) as RTargetObj;

    switch (target.targetType) {
      case 'raw':
        throw new Error('Unexpected raw target type returned from evalR');
      case 'err': {
        const e = new Error(target.obj.message);
        e.name = target.obj.name;
        e.stack = target.obj.stack;
        throw e;
      }
      default: {
        return newRProxy(this.#chan, target);
      }
    }
  }

  #newRObjConstructor<T, R>() {
    return new Proxy(RObjImpl, {
      construct: (_, args: [unknown]) => this.#newRObject(...args),
    }) as unknown as {
      new (arg: T): Promise<R>;
    };
  }

  async #newRObject(value: unknown): Promise<RObject> {
    const target = (await this.#chan.request({
      type: 'newRObject',
      data: replaceInObject(value, isRObject, (obj: RObject) => obj._target),
    })) as RTargetObj;
    switch (target.targetType) {
      case 'raw':
        throw new Error('Unexpected raw target type returned from newRObject');
      case 'err': {
        const e = new Error(target.obj.message);
        e.name = target.obj.name;
        e.stack = target.obj.stack;
        throw e;
      }
      default:
        return newRProxy(this.#chan, target);
    }
  }
}
