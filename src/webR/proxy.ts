import { RSexpObj, RawTypes, RSexp } from './sexp';
import { ChannelMain } from './chan/channel';

type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;
type RemoteProperty<T> = T extends Function | RSexp ? RProxy : Promisify<T>;
export type RProxy = { [P in keyof RSexp]: RemoteProperty<RSexp[P]> };

export function createRProxy(
  chan: ChannelMain,
  target: RSexpObj,
  path: (string | number | symbol)[] = []
): RProxy {
  const callableTarget = function () {} as unknown as RSexpObj;
  Object.assign(callableTarget, { ...target });
  const proxy = new Proxy(callableTarget, {
    get: (target: RSexpObj, prop: string | number | symbol) => {
      if (prop === '_unwrap') {
        return () => {
          return { obj: target.obj, raw: target.raw };
        };
      } else if (prop === 'then') {
        if (path.length === 0 && !target.raw) {
          return { then: () => proxy };
        }
        const r = chan
          .request({
            type: 'getRSexp',
            data: {
              target: { ...target },
              path: path.map((p) => p.toString()),
              args: false,
            },
          })
          .then((r: RSexpObj) => {
            return r.raw ? r.obj : createRProxy(chan, r);
          });
        return r.then.bind(r);
      }
      return createRProxy(chan, target, [...path, prop]);
    },
    async apply(target: RSexpObj, _thisArg, args: RawTypes[]) {
      const r = (await chan.request({
        type: 'getRSexp',
        data: {
          target: { ...target },
          path: path.map((p) => p.toString()),
          args: args,
        },
      })) as RSexpObj;
      return r.raw ? r.obj : createRProxy(chan, r);
    },
  });
  return proxy as unknown as RProxy;
}
