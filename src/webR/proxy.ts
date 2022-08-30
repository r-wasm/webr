import { RTargetObj, RTargetPtr, RObjImpl, RTargetType, isRObject } from './robj';
import { ChannelMain } from './chan/channel';

/** Obtain a union of the keys corresponding to methods of a given class T
 */
type Methods<T> = {
  [P in keyof T]: T[P] extends (...args: any) => any ? P : never;
}[keyof T];

/** Distributive conditional type for RProxy
 *
 * Distributes RProxy over any RObjImpls in the given union type U.
 */
type DistProxy<U> = U extends RObjImpl ? RProxy<U> : U;

/** Convert an RObjImpl property type to a corresponding RProxy property type
 *
 * RObjImpl types are converted into RProxy type, then wrapped in a Promise.
 *
 * Function signatures are mapped so that arguments with RObjImpl type instead
 * take RProxy<RObjImpl> type. Other function arguments remain as they are.
 * The function return type is also converted to a corresponding type
 * using RProxify recursively.
 *
 * Any other types are wrapped in a Promise.
 */
type RProxify<T> = T extends RObjImpl
  ? Promise<RProxy<RObjImpl>>
  : T extends (...args: infer U) => any
  ? (
      ...args: {
        [V in keyof U]: DistProxy<U[V]>;
      }
    ) => RProxify<ReturnType<T>>
  : Promise<T>;

/** Create an RProxy type based on an RObjImpl type parameter
 *
 * RProxy is intended to be used in place of RObjImpl on the main thread.
 * An RProxy has the same instance methods as the given RObjImpl parameter,
 * with the following differences:
 *   - Method arguments take RProxy rather than RObjImpl
 *   - Where an RObjImpl would be returned, an RProxy is returned instead
 *   - All return types are wrapped in a Promise
 *
 * If required, the proxy target can be accessed directly through the _target
 * property.
 */
export type RProxy<T extends RObjImpl> = { [P in Methods<T>]: RProxify<T[P]> } & {
  _target: RTargetObj;
};

export function newRProxy(chan: ChannelMain, target: RTargetPtr): RProxy<RObjImpl> {
  return new Proxy(target, {
    get: (_target: RTargetObj, prop: string | number | symbol) => {
      if (prop === '_target') {
        return target;
      } else if (target.methods.includes(prop.toString())) {
        return async (...args: unknown[]) => {
          return chan
            .request({
              type: 'callRObjMethod',
              data: {
                target: target,
                prop: prop.toString(),
                args: Array.from({ length: args.length }, (_, idx) => {
                  const arg = args[idx];
                  return isRObject(arg) ? arg._target : { obj: arg, type: RTargetType.RAW };
                }),
              },
            })
            .then((r: RTargetObj) => {
              if (r.obj instanceof Error) {
                throw r.obj;
              }
              return r.type === RTargetType.PTR ? newRProxy(chan, r) : r.obj;
            });
        };
      }
    },
  }) as unknown as RProxy<RObjImpl>;
}
