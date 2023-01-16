import { ChannelMain } from './chan/channel';
import { replaceInObject } from './utils';
import { isWebRPayloadPtr, webRPayloadError, WebRPayloadPtr, WebRPayload } from './payload';
import { RType, WebRDataRaw } from './robj';
import { isRObject, RObject, isRFunction } from './robj-main';
import * as RWorker from './robj-worker';

/** Obtain a union of the keys corresponding to methods of a given class T
 */
type Methods<T> = {
  [P in keyof T]: T[P] extends (...args: any) => any ? P : never;
}[keyof T];

/** Distributive conditional type for RProxy
 *
 * Distributes RProxy over any RWorker.RObject in the given union type U.
 */
export type DistProxy<U> = U extends RWorker.RObject ? RProxy<U> : U;

/** Convert RWorker.RObject properties for use with an RProxy.
 *
 * Properties in the type parameter are mapped so that RProxy is distributed
 * over any RWorker.RObject types, then wrapped in a Promise.
 *
 * Function signatures are mapped so that arguments with RWorker.RObject type
 * instead take RProxy<RWorker.RObject> type. Other function arguments remain as
 * they are. The function return type is also converted to a corresponding type
 * using RProxify recursively.
 */
type RProxify<T> = T extends Array<any>
  ? Promise<DistProxy<T[0]>[]>
  : T extends (...args: infer U) => any
  ? (
      ...args: {
        [V in keyof U]: DistProxy<U[V]>;
      }
    ) => RProxify<ReturnType<T>>
  : Promise<DistProxy<T>>;

/** Create an RProxy type based on an RWorker.RObject type parameter.
 *
 * RProxy is intended to be used in place of RWorker.RObject on the main thread.
 * An RProxy has the same instance methods as the given RWorker.RObject
 * parameter, with the following differences:
 *   - Method arguments take RProxy rather than RWorker.RObject
 *   - Where an RWorker.RObject would be returned, an RProxy is returned instead
 *   - All return types are wrapped in a Promise
 *
 * If required, the WebRPayloadPtr object associated with the proxy can be
 * accessed directly through the _payload property.
 */
export type RProxy<T extends RWorker.RObject> = { [P in Methods<T>]: RProxify<T[P]> } & {
  _payload: WebRPayloadPtr;
  [Symbol.asyncIterator](): AsyncGenerator<RProxy<RWorker.RObject>, void, unknown>;
};

/* The empty function is used as base when we are proxying RFunction objects.
 * This enables function call semantics on the proxy using the apply hook.
 */
function empty() {}

/* Proxy the asyncIterator property for R objects with a length. This allows us
 * to use the `for await (i of obj){}` JavaScript syntax.
 */
function targetAsyncIterator(chan: ChannelMain, proxy: RProxy<RWorker.RObject>) {
  return async function* () {
    // Get the R object's length
    const reply = await chan.request({
      type: 'callRObjectMethod',
      data: {
        payload: proxy._payload,
        prop: 'getPropertyValue',
        args: [{ payloadType: 'raw', obj: 'length' }],
      },
    });

    // Throw an error if there was some problem accessing the object length
    if (reply.payloadType === 'err') {
      throw webRPayloadError(reply);
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
 *
 * When the optional payload argument is not provided, an RWorker.RObject static
 * method is called.
 */
export function targetMethod(chan: ChannelMain, prop: string): any;
export function targetMethod(chan: ChannelMain, prop: string, payload: WebRPayloadPtr): any;
export function targetMethod(chan: ChannelMain, prop: string, payload?: WebRPayloadPtr): any {
  return async (..._args: unknown[]) => {
    const args = _args.map((arg) => {
      if (isRObject(arg)) {
        return arg._payload;
      }
      return {
        obj: replaceInObject(arg, isRObject, (obj: RObject) => obj._payload),
        payloadType: 'raw',
      };
    });

    const reply = await chan.request({
      type: 'callRObjectMethod',
      data: { payload, prop, args },
    });

    switch (reply.payloadType) {
      case 'ptr':
        return newRProxy(chan, reply);
      case 'err':
        throw webRPayloadError(reply);
      default: {
        const proxyReply = replaceInObject(
          reply,
          isWebRPayloadPtr,
          (obj: WebRPayloadPtr, chan: ChannelMain) => newRProxy(chan, obj),
          chan
        ) as WebRPayload;
        return proxyReply.obj;
      }
    }
  };
}

/* Proxy the RWorker.RObject class constructors. This allows us to create a new
 * R object on the worker thread from a given JS object.
 */
async function newRObject(chan: ChannelMain, objType: RType | 'object', value: unknown) {
  const payload = await chan.request({
    type: 'newRObject',
    data: {
      objType,
      obj: replaceInObject(value, isRObject, (obj: RObject) => obj._payload),
    },
  });
  switch (payload.payloadType) {
    case 'raw':
      throw new Error('Unexpected raw payload type returned from newRObject');
    case 'err':
      throw webRPayloadError(payload);
    default:
      return newRProxy(chan, payload);
  }
}

export function newRProxy(chan: ChannelMain, payload: WebRPayloadPtr): RProxy<RWorker.RObject> {
  const proxy = new Proxy(
    // Assume we are proxying an RFunction if the methods list contains 'exec'.
    payload.obj.methods?.includes('exec') ? Object.assign(empty, { ...payload }) : payload,
    {
      get: (_: WebRPayload, prop: string | number | symbol) => {
        if (prop === '_payload') {
          return payload;
        } else if (prop === Symbol.asyncIterator) {
          return targetAsyncIterator(chan, proxy);
        } else if (payload.obj.methods?.includes(prop.toString())) {
          return targetMethod(chan, prop.toString(), payload);
        }
      },
      apply: async (_: WebRPayload, _thisArg, args: (WebRDataRaw | RProxy<RWorker.RObject>)[]) => {
        const res = await (newRProxy(chan, payload) as RProxy<RWorker.RFunction>).exec(...args);
        return isRFunction(res) ? res : res.toJs();
      },
    }
  ) as unknown as RProxy<RWorker.RObject>;
  return proxy;
}

export function newRClassProxy<T, R>(chan: ChannelMain, objType: RType | 'object') {
  return new Proxy(RWorker.RObject, {
    construct: (_, args: [unknown]) => newRObject(chan, objType, ...args),
    get: (_, prop: string | number | symbol) => {
      return targetMethod(chan, prop.toString());
    },
  }) as unknown as (T extends abstract new (...args: infer U) => any
    ? {
        new (
          ...args: {
            [V in keyof U]: Exclude<U[V], WebRPayload>;
          }
        ): Promise<R>;
      }
    : never) & {
    [P in Methods<typeof RWorker.RObject>]: RProxify<typeof RWorker.RObject[P]>;
  };
}
