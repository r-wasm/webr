import { ChannelMain } from './chan/channel';
import { Message } from './chan/message';
import { FSNode, WebROptions } from './utils';
import { RSexpObj, RawTypes, RSexp } from './sexp';

type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;
type RemoteProperty<T> = T extends Function | RSexp ? RProxy : Promisify<T>;
type RProxy = { [P in keyof RSexp]: RemoteProperty<RSexp[P]> };

function createRProxy(
  chan: ChannelMain,
  target: RSexpObj | Function,
  path: (string | number | symbol)[] = []
): RProxy {
  const proxy = new Proxy(target, {
    get: (target: RSexpObj & Function, prop: string | number | symbol) => {
      if (prop === 'then') {
        if (path.length === 0 && !target.raw) {
          return { then: () => proxy };
        }
        const r = chan
          .request({
            type: 'getRSexp',
            data: {
              rObj: { obj: target.obj, raw: target.raw },
              path: path.map((p) => p.toString()),
              args: false,
            },
          })
          .then((r: RSexpObj) => {
            const callableTarget = function () {};
            Object.assign(callableTarget, { ...r });
            return r.raw ? r.obj : createRProxy(chan, callableTarget);
          });
        return r.then.bind(r);
      }
      return createRProxy(chan, target, [...path, prop]);
    },
    apply(target: RSexpObj & Function, _thisArg, args: RawTypes[]) {
      return chan
        .request({
          type: 'getRSexp',
          data: {
            rObj: { obj: target.obj, raw: target.raw },
            path: path.map((p) => p.toString()),
            args: args,
          },
        })
        .then((r: RSexpObj) => {
          const callableTarget = function () {};
          Object.assign(callableTarget, { ...r });
          return r.raw ? r.obj : createRProxy(chan, callableTarget);
        });
    },
  });
  return proxy as unknown as RProxy;
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
  evalRCode(code: string): RProxy {
    const callableTarget = function () {};
    Object.assign(callableTarget, { obj: code, raw: true });
    return createRProxy(this.#chan, callableTarget);
  }
}
