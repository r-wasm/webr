/**
 * Proxy R objects on the webR worker thread so that they can be accessed from
 * the main thread.
 * @module Proxy
 */
import { ChannelMain } from './chan/channel';
import { replaceInObject } from './utils';
import { isWebRPayloadPtr, WebRPayloadPtr, WebRPayload } from './payload';
import { RType, WebRData, WebRDataRaw } from './robj';
import { isRObject, RObject, isRFunction } from './robj-main';
import * as RWorker from './robj-worker';
import { ShelterID, CallRObjectMethodMessage, NewRObjectMessage } from './webr-chan';

/**
 * Obtain a union of the keys corresponding to methods of a given class `T`.
 * @typeParam T The type to provide the methods for.
 */
export type Methods<T> = {
  [P in keyof T]: T[P] extends (...args: any) => any ? P : never;
}[keyof T];

/**
 * Distributive conditional type for {@link RProxy}.
 *
 * Distributes {@link RProxy} over any {@link RWorker.RObject} in the given
 * union type U.
 *
 * @typeParam U The type union to distribute {@link RProxy} over.
 */
export type DistProxy<U> = U extends RWorker.RObject ? RProxy<U> : U;

/**
 * Convert {@link RWorker.RObject} properties for use with an {@link RProxy}.
 *
 * Properties in the type parameter `T` are mapped so that {@link RProxy} is
 * distributed over any {@link RWorker.RObject} types, then wrapped in a
 * Promise.
 *
 * Function signatures are mapped so that arguments with {@link RWorker.RObject}
 * type instead take {@link RProxy}<{@link RWorker.RObject}> type. Other
 * function arguments remain as they are. The function return type is also
 * converted to a corresponding type using `RProxify` recursively.
 *
 * @typeParam T The type to convert.
 */
export type RProxify<T> = T extends Array<any>
  ? Promise<DistProxy<T[0]>[]>
  : T extends (...args: infer U) => any
  ? (
      ...args: {
        [V in keyof U]: DistProxy<U[V]>;
      }
    ) => RProxify<ReturnType<T>>
  : Promise<DistProxy<T>>;

/**
 * Create an {@link RProxy} based on an {@link RWorker.RObject} type parameter.
 *
 * R objects created via an {@link RProxy} are intended to be used in place of
 * {@link RWorker.RObject} on the main thread. An {@link RProxy} object has the
 * same instance methods as the given {@link RWorker.RObject} parameter, with
 * the following differences:
 * * Method arguments take `RProxy` in place of {@link RWorker.RObject}.
 *
 * * Where an {@link RWorker.RObject} would be returned, an `RProxy` is
 *   returned instead.
 *
 * * All return types are wrapped in a Promise.
 *
 * If required, the {@link Payload.WebRPayloadPtr} object associated with the
 * proxy can be accessed directly through the `_payload` property.
 *
 * @typeParam T The {@link RWorker.RObject} type to convert into `RProxy` type.
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
    const msg: CallRObjectMethodMessage = {
      type: 'callRObjectMethod',
      data: {
        payload: proxy._payload,
        prop: 'getPropertyValue',
        args: [{ payloadType: 'raw', obj: 'length' }],
        shelter: undefined, // TODO
      },
    };
    const reply = await chan.request(msg);

    // Throw an error if there was some problem accessing the object length
    if (typeof reply.obj !== 'number') {
      throw new Error('Cannot iterate over object, unexpected type for length property.');
    }

    // Loop through the object and yield values
    for (let i = 1; i <= reply.obj; i++) {
      yield proxy.get(i);
    }
  };
}

/**
 * Proxy an R object method by providing an async function that requests that
 * the worker thread calls the method and then returns the result.
 *
 * When the optional payload argument has not been provided, an
 * {@link RWorker.RObject} static method is called.
 */
export function targetMethod(chan: ChannelMain, prop: string): any;
export function targetMethod(chan: ChannelMain, prop: string, payload: WebRPayloadPtr): any;
export function targetMethod(chan: ChannelMain, prop: string, payload?: WebRPayloadPtr): any {
  return async (..._args: WebRData[]) => {
    const args = _args.map((arg) => {
      if (isRObject(arg)) {
        return arg._payload;
      }
      return {
        obj: replaceInObject(arg, isRObject, (obj: RObject) => obj._payload),
        payloadType: 'raw',
      } as WebRPayload;
    });

    const msg: CallRObjectMethodMessage = {
      type: 'callRObjectMethod',
      data: { payload, prop, args: args },
    };
    const reply = await chan.request(msg);

    switch (reply.payloadType) {
      case 'ptr':
        return newRProxy(chan, reply);
      case 'raw': {
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

/* Proxy the `RWorker` class constructors. This allows us to create a new R
 * object on the worker thread from a given JS object.
 */
async function newRObject(
  chan: ChannelMain,
  objType: RType | 'object',
  shelter: ShelterID,
  value: WebRData
) {
  const msg: NewRObjectMessage = {
    type: 'newRObject',
    data: {
      objType,
      obj: replaceInObject(value, isRObject, (obj: RObject) => obj._payload),
      shelter: shelter,
    },
  };
  const payload = await chan.request(msg);
  switch (payload.payloadType) {
    case 'raw':
      throw new Error('Unexpected raw payload type returned from newRObject');
    case 'ptr':
      return newRProxy(chan, payload);
  }
}

/**
 * Proxy an R object.
 *
 * The proxy targets a particular R object in WebAssembly memory. Methods of the
 * relevant subclass of {@link RWorker.RObject} are proxied, enabling
 * structured manipulation of R objects from the main thread.
 *
 * @param {ChannelMain} chan The current main thread communication channel.
 * @param {WebRPayloadPtr} payload A webR payload referencing an R object.
 * @return {RProxy<RWorker.RObject>} An {@link RObject} corresponding to the
 * referenced R object.
 */
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

/**
 * Proxy an R object class.
 *
 * The class constructors and static methods of {@link RWorker.RObject} and its
 * subclasses are proxied, enabling access to R object construction from the
 * main thread.
 *
 * @param {ChannelMain} chan The current main thread communication channel.
 * @param {ShelterID} shelter The shelter ID to protect returned objects with.
 * @param {(RType | 'object')} objType The R object type, or `'object'` for the
 * generic {@link RWorker.RObject} class.
 * @return {RWorker.RObject} A proxy to the R object class corresponding to the
 * given value of the `objType` argument.
 *
 * @typeParam T The type for the proxied class constructor argument.
 * @typeParam R The type to be returned from the proxied class constructor.
 */
export function newRClassProxy<T, R>(
  chan: ChannelMain,
  shelter: ShelterID,
  objType: RType | 'object'
) {
  return new Proxy(RWorker.RObject, {
    construct: (_, args: [WebRData]) => newRObject(chan, objType, shelter, ...args),
    get: (_, prop: string | number | symbol) => {
      return targetMethod(chan, prop.toString());
    },
  }) as unknown as (T extends abstract new (...args: infer U) => any
    ? {
        new (
          ...args: {
            [V in keyof U]: U[V];
          }
        ): Promise<R>;
      }
    : never) & {
    [P in Methods<typeof RWorker.RObject>]: RProxify<(typeof RWorker.RObject)[P]>;
  };
}
