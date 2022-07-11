import { ChannelMain } from './chan/channel';
import { Message } from './chan/message';
import { FSNode, WebROptions, RProxyResponse, Rptr } from './utils';
import { ImplicitTypes, RProxy } from './sexp';

class RMainProxy extends Function {
  ptr: Rptr;
  constructor(ptr: Rptr, handler: ProxyHandler<any>) {
    super();
    this.ptr = ptr;
    return new Proxy(this, handler) as RMainProxy;
  }
}

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

  proxyRSexp(rSexpPtr: Rptr): RMainProxy {
    const sexpHandlers = {
      get: async (target: RMainProxy, prop: string | symbol): Promise<any> => {
        const r = (await this.#chan.request({
          type: 'proxyProp',
          data: { ptr: target.ptr, prop: prop },
        })) as RProxyResponse;
        if (r.converted) {
          return r.obj;
        }
        if (r.function) {
          // TODO: Create a proxy object that calls the relevant function in the worker
          return () => {
            console.log('Function');
          };
        }
        return this.proxyRSexp(r.obj as Rptr);
      },
      apply: async (target: RMainProxy, _: any, args: Array<any>) => {
        const r = (await this.#chan.request({
          type: 'proxyCall',
          data: { ptr: target.ptr, args },
        })) as RProxyResponse;
        if (r.converted) {
          return r.obj;
        }
        return this.proxyRSexp(r.obj as Rptr);
      },
    };
    return new RMainProxy(rSexpPtr, sexpHandlers);
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
  async evalRCode(code: string): Promise<RMainProxy | ImplicitTypes> {
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
