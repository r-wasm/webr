import { RTargetType, RTargetPtr, isRObject, RTargetObj } from './robj';
import { RObjImpl, RObjFunction, RawType, isRFunction } from './robj';
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
  ? Promise<RProxy<T>>
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
  [Symbol.asyncIterator](): AsyncGenerator<RProxy<RObjImpl>, void, unknown>;
};

/* The empty function is used as base when we are proxying RFunction objects.
 * This enables function call semantics on the proxy using the apply hook.
 */
function empty() {}

/* Proxy the asyncIterator property for R objects with a length. This allows us
 * to use the `for await (i of obj){}` JavaScript syntax.
 */
function targetAsyncIterator(chan: ChannelMain, proxy: RProxy<RObjImpl>) {
  return async function* () {
    // Get the R object's length
    const reply = (await chan.request({
      type: 'getRObjProperty',
      data: {
        target: proxy._target,
        prop: 'length',
      },
    })) as RTargetObj;

    // Throw an error if there was some problem accessing the object length
    if (reply.type === RTargetType.ERR) {
      const e = new Error(`Cannot iterate over object, ${reply.obj.message}`);
      e.name = reply.obj.name;
      e.stack = reply.obj.stack;
      throw e;
    } else if (typeof reply.obj !== 'number') {
      throw new Error('Cannot iterate over object, unexpected type for length property.');
    }

    // Loop through the object and yield values
    for (let i = 1; i <= reply.obj; i++) {
      yield proxy.get(i);
    }
  };
}

/* Proxy an R object method by providing an async function that requests that
 * the worker thread calls the method and then returns the result.
 */
function targetMethod(chan: ChannelMain, target: RTargetPtr, prop: string) {
  return async (..._args: unknown[]) => {
    const args = Array.from({ length: _args.length }, (_, idx) => {
      const arg = _args[idx];
      return isRObject(arg) ? arg._target : { obj: arg, type: RTargetType.RAW };
    });

    const reply = (await chan.request({
      type: 'callRObjMethod',
      data: { target, prop, args },
    })) as RTargetObj;

    switch (reply.type) {
      case RTargetType.PTR:
        return newRProxy(chan, reply);
      case RTargetType.ERR: {
        const e = new Error(reply.obj.message);
        e.name = reply.obj.name;
        e.stack = reply.obj.stack;
        throw e;
      }
      default:
        return reply.obj;
    }
  };
}

export function newRProxy(chan: ChannelMain, target: RTargetPtr): RProxy<RObjImpl> {
  const proxy = new Proxy(
    // Assume we are proxying an RFunction if the methods list contains 'exec'.
    target.methods.includes('exec') ? Object.assign(empty, { ...target }) : target,
    {
      get: (_: RTargetObj, prop: string | number | symbol) => {
        if (prop === '_target') {
          return target;
        } else if (prop === Symbol.asyncIterator) {
          return targetAsyncIterator(chan, proxy);
        } else if (target.methods.includes(prop.toString())) {
          return targetMethod(chan, target, prop.toString());
        }
      },
      apply: async (_: RTargetObj, _thisArg, args: (RawType | RProxy<RObjImpl>)[]) => {
        const res = await (newRProxy(chan, target) as RProxy<RObjFunction>).exec(...args);
        return isRFunction(res) ? res : res.toJs();
      },
    }
  ) as unknown as RProxy<RObjImpl>;
  return proxy;
}
