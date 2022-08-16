import { RTargetObj, RTargetPtr, RObj, RTargetType, RawType } from './robj';
import { ChannelMain } from './chan/channel';

type Promisify<T> = T extends (...args: any) => any
  ? (...args: Parameters<T>) => Promisify<RemoteProperty<ReturnType<T>>>
  : T extends Promise<unknown>
  ? T
  : Promise<T>;
type RemoteProperty<P> = P extends RObj ? RProxy<RObj> : Promisify<P>;
export type RProxy<T> = { [P in keyof T]: RemoteProperty<T[P]> } & {
  _target: RTargetObj;
} & {
  [key: string | number]: RemoteProperty<RObj>;
};

export function isRProxy(value: any): value is RProxy<RObj> {
  // An RProxy acts like a function, but with RTargetObj properties
  return typeof value === 'function' && 'type' in value && 'obj' in value;
}

export function newRProxy(
  chan: ChannelMain,
  target: RTargetPtr,
  path: (string | number | symbol)[] = []
): RProxy<RObj> {
  // Make target callable, so we can trap calls using the apply handler
  const callableTarget = function () {} as unknown as RTargetObj & {
    length: unknown;
    name: unknown;
    prototype: unknown;
  };
  Object.assign(callableTarget, { ...target });

  // Remove some unwanted properties added by the above procedure
  delete callableTarget.length;
  delete callableTarget.name;
  callableTarget.prototype = undefined;

  const proxy = new Proxy(callableTarget, {
    get: (callableTarget: RTargetObj, prop: string | number | symbol) => {
      if (prop === '_target') {
        return target;
      } else if (prop === 'then') {
        if (path.length === 0) {
          return { then: () => proxy };
        }
        const r = chan
          .request({
            type: 'getRObj',
            data: {
              target: target,
              path: path.map((p) => p.toString()),
            },
          })
          .then((r: RTargetObj) => {
            if (r.obj instanceof Error) {
              throw r.obj;
            }
            return r.type === RTargetType.PTR ? newRProxy(chan, r) : r.obj;
          });
        return r.then.bind(r);
      }
      return newRProxy(chan, target, [...path, prop]);
    },
    async apply(callableTarget: RTargetObj, _thisArg, args: (RProxy<RObj> | RawType)[]) {
      const r = (await chan.request({
        type: 'callRObj',
        data: {
          target: target,
          path: path.map((p) => p.toString()),
          args: Array.from({ length: args.length }, (_, idx) => {
            const arg = args[idx];
            return isRProxy(arg) ? arg._target : { obj: arg, type: RTargetType.RAW };
          }),
        },
      })) as RTargetObj;
      if (r.obj instanceof Error) {
        throw r.obj;
      }
      return r.type === RTargetType.PTR ? newRProxy(chan, r) : r.obj;
    },
  }) as unknown as RProxy<RObj>;
  return proxy;
}
