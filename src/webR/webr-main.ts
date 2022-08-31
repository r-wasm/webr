import { ChannelMain } from './chan/channel';
import { Message } from './chan/message';
import { BASE_URL, PKG_BASE_URL } from './config';
import { newRProxy } from './proxy';
import { RTargetObj, RTargetType, RObject, isRObject } from './robj';

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
};

export class WebR {
  #chan;

  constructor(options: WebROptions = {}) {
    const config: Required<WebROptions> = Object.assign(defaultOptions, options);
    this.#chan = new ChannelMain(`${config.WEBR_URL}webr-worker.js`, config);
  }

  async init() {
    return await this.#chan.initialised;
  }

  async read(): Promise<Message> {
    return await this.#chan.read();
  }

  write(msg: Message) {
    this.#chan.write(msg);
  }
  writeConsole(input: string) {
    this.write({ type: 'stdin', data: input });
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
    options: { env?: RObject; withHandlers?: boolean } = {}
  ): Promise<RObject> {
    if (options.env && !isRObject(options.env)) {
      throw new Error('Attempted to evalRcode with invalid environment object');
    }

    const target = (await this.#chan.request({
      type: 'evalRCode',
      data: {
        code: code,
        options: {
          env: options.env?._target.obj,
          withHandlers: options.withHandlers,
        },
      },
    })) as RTargetObj;

    if (target.obj instanceof Error) {
      throw target.obj;
    }
    if (target.type === RTargetType.RAW) {
      throw new Error('Unexpected raw target type returned from evalRCode');
    }

    return newRProxy(this.#chan, target);
  }
}
