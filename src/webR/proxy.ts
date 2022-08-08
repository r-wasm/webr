import { RTargetObj, RTargetType, RawTypes, RObj } from './robj';
import { ChannelMain } from './chan/channel';

type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;
type RemoteProperty<T> = T extends Function | RObj ? RProxy : Promisify<T>;
export type RProxy = { [P in keyof RObj]: RemoteProperty<RObj[P]> } & {
  [_target: string]: RTargetObj;
};

export function isRProxy(value: any): value is RProxy {
  // An RProxy acts like a function, but with RTargetObj properties
  return typeof value === 'function' && 'type' in value && 'data' in value;
}

export function createRProxy(
  chan: ChannelMain,
  target: RTargetObj,
  path: (string | number | symbol)[] = []
): RProxy {
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
    get: (target: RTargetObj, prop: string | number | symbol) => {
      if (prop === '_target') {
        return { data: target.data, type: target.type };
      } else if (prop === 'then') {
        if (path.length === 0 && target.type === RTargetType.PTR) {
          return { then: () => proxy };
        }
        const r = chan
          .request({
            type: 'getRObj',
            data: {
              target: { ...target },
              path: path.map((p) => p.toString()),
              args: false,
            },
          })
          .then((r: RTargetObj) => {
            return r.type === RTargetType.RAW ? r.data : createRProxy(chan, r);
          });
        return r.then.bind(r);
      }
      return createRProxy(chan, target, [...path, prop]);
    },
    async apply(target: RTargetObj, _thisArg, args: (RProxy | RawTypes)[]) {
      const r = (await chan.request({
        type: 'getRObj',
        data: {
          target: { ...target },
          path: path.map((p) => p.toString()),
          args: Array.from({ length: args.length }, (_, idx) => {
            const arg = args[idx];
            return isRProxy(arg) ? arg._target : { data: arg, type: RTargetType.RAW };
          }),
        },
      })) as RTargetObj;
      return r.type === RTargetType.RAW ? r.data : createRProxy(chan, r);
    },
    set(target: RTargetObj, prop: string | number | symbol, value: RProxy | RawTypes) {
      chan.request({
        type: 'setRObj',
        data: {
          target: { ...target },
          path: [...path, prop].map((p) => p.toString()),
          value: isRProxy(value) ? value._target : { data: value, type: RTargetType.RAW },
        },
      });
      // TODO: This should return false if the assignment failed.
      // Perhaps we could return a promise here, slightly breaking the spec.
      return true;
    },
  });
  return proxy as unknown as RProxy;
}
