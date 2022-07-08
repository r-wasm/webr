import { ChannelMain } from './chan/channel';
import { Message } from './chan/message';
import { FSNode, WebROptions, RSexpPtr, RProxyResponse } from './utils';
import { ImplicitTypes, RProxy } from './sexp';

export class WebR {
  #chan;

  constructor(options: WebROptions = {}) {
    this.#chan = new ChannelMain('./webr-worker.js', options);
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

  proxyRSexp(rSexpPtr: RSexpPtr): RProxy {
    const sexpHandlers = {
      get: async (target: RSexpPtr, prop: string | symbol): Promise<RProxy | ImplicitTypes> => {
        const r = (await this.#chan.request({
          type: 'proxyProp',
          data: { ptr: rSexpPtr.ptr, prop: prop },
        })) as RProxyResponse;
        if (r.converted) {
          return r.obj as ImplicitTypes;
        }
        return this.proxyRSexp(r.obj as RSexpPtr);
      },
    };
    return new Proxy(rSexpPtr, sexpHandlers) as RProxy;
  }

  async putFileData(name: string, data: Uint8Array) {
    const msg = { type: 'putFileData', data: { name: name, data: data } };
    await this.#chan.request(msg);
  }
  async getFileData(name: string): Promise<Uint8Array> {
    return (await this.#chan.request({ type: 'getFileData', data: { name: name } })) as Uint8Array;
  }
  async getFSNode(path: string): Promise<FSNode> {
    return (await this.#chan.request({ type: 'getFSNode', data: { path: path } })) as FSNode;
  }
  async evalRCode(code: string): Promise<RProxy | ImplicitTypes> {
    const r = (await this.#chan.request({
      type: 'evalRCode',
      data: { code: code },
    })) as RProxyResponse;

    if (r.converted) {
      return r.obj as ImplicitTypes;
    }
    return this.proxyRSexp(r.obj as RSexpPtr);
  }
}
