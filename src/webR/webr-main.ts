import { ChannelMain } from './chan/channel';
import { Message } from './chan/message';
import { isRProxy, newRProxy, RProxy } from './proxy';
import { RTargetObj, RTargetType, RObj } from './robj';

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

export class WebR {
  #chan;

  constructor(options: WebROptions = {}) {
    this.#chan = new ChannelMain('./webr-worker.js', options);
  }

  async init() {
    return await this.#chan.initialised;
  }

  async ready() {
    /* Create a barrier and await until R has caught up.
       TODO: Handle this using a busy signal within webR.
     */
    return await this.#chan.request({ type: 'tic' });
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

  async evalRCode(code: string, env?: RProxy<RObj>): Promise<RProxy<RObj>> {
    if (env && !isRProxy(env)) {
      throw new Error('Attempted to evalRcode with invalid environment object');
    }

    const target = (await this.#chan.request({
      type: 'evalRCode',
      data: { code: code, env: env?._target.obj },
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
