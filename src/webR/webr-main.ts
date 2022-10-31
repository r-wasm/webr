import { newChannelMain, ChannelMain, ChannelType } from './chan/channel';
import { Message } from './chan/message';
import { BASE_URL, PKG_BASE_URL } from './config';
import { newRProxy } from './proxy';
import { unpackScalarVectors, mergeListArrays } from './utils';
import { RTargetObj, RTargetType, RObject, isRObject, RawType, RList, RObjectTree } from './robj';

export type EvalRCodeOptions = {
  captureStreams?: boolean;
  captureConditions?: boolean;
  withAutoprint?: boolean;
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
  homedir?: string;
  interactive?: boolean;
  channelType?: ChannelType;
}

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
  interactive: true,
  channelType: ChannelType.Automatic,
};

export class WebR {
  #chan: ChannelMain;

  constructor(options: WebROptions = {}) {
    const config: Required<WebROptions> = Object.assign(defaultOptions, options);
    this.#chan = newChannelMain(`${config.WEBR_URL}webr-worker.js`, config);
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

  async evalRCode(
    code: string,
    env?: RObject,
    options: EvalRCodeOptions = {}
  ): Promise<{
    result: RObject;
    output: unknown[];
  }> {
    if (env && !isRObject(env)) {
      throw new Error('Attempted to evalRcode with invalid environment object');
    }

    const target = (await this.#chan.request({
      type: 'evalRCode',
      data: {
        code: code,
        env: env?._target.obj,
        options: options,
      },
    })) as RTargetObj;

    switch (target.type) {
      case RTargetType.RAW:
        throw new Error('Unexpected raw target type returned from evalRCode');
      case RTargetType.ERR: {
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
        const output = (await outList.toArray())
          .map((v) => unpackScalarVectors(v) as RObjectTree<RawType[]>)
          .map((v) => mergeListArrays(v));
        obj.release();
        return { result, output };
      }
    }
  }

  async newRObject(jsObj: RawType): Promise<RObject> {
    const target = (await this.#chan.request({
      type: 'newRObject',
      data: {
        obj: { type: RTargetType.RAW, obj: jsObj },
      },
    })) as RTargetObj;
    switch (target.type) {
      case RTargetType.RAW:
        throw new Error('Unexpected raw target type returned from newRObject');
      case RTargetType.ERR: {
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
