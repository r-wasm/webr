import { ChannelMain } from './chan/channel';
import { Message } from './chan/message';
import { FSNode, WebROptions, RProxyResponse, Rptr, RCallInfo } from './utils';
import { ImplicitTypes, RProxy } from './sexp';

class RProxyMain extends Function {
  ptr: Rptr;
  constructor(ptr: Rptr, handler: ProxyHandler<any>) {
    super();
    this.ptr = ptr;
    return new Proxy(this, handler) as RProxyMain;
  }
}

export class WebR {
  #chan;

  #createRProxyCall(
    target: RProxyMain,
    prop: string | symbol,
    callList: Array<RCallInfo> = []
  ): (...args: Array<unknown>) => Promise<any> {
    return async (...args: Array<unknown>) => {
      callList.push({ name: prop, args: args });
      const r = (await this.#chan.request({
        type: 'proxyCall',
        data: {
          ptr: target.ptr,
          callList: callList,
        },
      })) as RProxyResponse;
      if (r.converted) {
        return r.obj;
      }
      if (r.function) {
        return this.#createRProxyCall(target, '_call', callList);
      }
      return this.#createRProxyMain(r.obj as Rptr);
    };
  }

  #createRProxyMain(rSexpPtr: Rptr): RProxyMain {
    const sexpHandlers = {
      get: async (target: RProxyMain, prop: keyof RProxy): Promise<any> => {
        const r = (await this.#chan.request({
          type: 'proxyProp',
          data: { ptr: target.ptr, prop: prop },
        })) as RProxyResponse;
        if (r.converted) {
          return r.obj;
        }
        if (r.function) {
          return this.#createRProxyCall(target, prop);
        }
        return this.#createRProxyMain(r.obj as Rptr);
      },
      apply: (target: RProxyMain, _: any, args: Array<unknown>) => {
        return this.#createRProxyCall(target, '_call')(...args);
      },
    };
    return new RProxyMain(rSexpPtr, sexpHandlers);
  }

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
  async evalRCode(code: string): Promise<RProxyMain | ImplicitTypes> {
    const r = (await this.#chan.request({
      type: 'evalRCode',
      data: { code: code },
    })) as RProxyResponse;
    if (r.converted) {
      return r.obj;
    }
    if (typeof r.obj === 'number') {
      return this.#createRProxyMain(r.obj);
    }
    throw Error(`Unexpected response received from from evalRCode: ${typeof r.obj}`);
  }
}
