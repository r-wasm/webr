import type { Module } from './module';
import type { RProxy } from './proxy';
import { isWebRPayloadPtr } from './payload';
import { RObjTree, RObjTreeAtomic } from './robj-tree';
import * as RWorker from './robj-worker';

declare let Module: Module;

// RProxy<RWorker.RObject> type aliases
export type RObject = RProxy<RWorker.RObject>;
export type RNull = RProxy<RWorker.RNull>;
export type RSymbol = RProxy<RWorker.RSymbol>;
export type RPairlist = RProxy<RWorker.RPairlist>;
export type REnvironment = RProxy<RWorker.REnvironment>;
export type RString = RProxy<RWorker.RString>;
export type RLogical = RProxy<RWorker.RLogical>;
export type RInteger = RProxy<RWorker.RInteger>;
export type RDouble = RProxy<RWorker.RDouble>;
export type RComplex = RProxy<RWorker.RComplex>;
export type RCharacter = RProxy<RWorker.RCharacter>;
export type RList = RProxy<RWorker.RList>;
export type RRaw = RProxy<RWorker.RRaw>;
// RFunction proxies are callable
export type RFunction = RProxy<RWorker.RFunction> & ((...args: unknown[]) => Promise<unknown>);

export type RPtr = number;

export const RTypeMap = {
  null: 0,
  symbol: 1,
  pairlist: 2,
  closure: 3,
  environment: 4,
  promise: 5,
  call: 6,
  special: 7,
  builtin: 8,
  string: 9,
  logical: 10,
  integer: 13,
  double: 14,
  complex: 15,
  character: 16,
  dots: 17,
  any: 18,
  list: 19,
  expression: 20,
  bytecode: 21,
  pointer: 22,
  weakref: 23,
  raw: 24,
  s4: 25,
  new: 30,
  free: 31,
  function: 99,
} as const;
export type RType = keyof typeof RTypeMap;
export type RTypeNumber = typeof RTypeMap[keyof typeof RTypeMap];

export type Complex = {
  re: number;
  im: number;
};

export type RawType =
  | number
  | string
  | boolean
  | undefined
  | null
  | Complex
  | Error
  | ArrayBuffer
  | ArrayBufferView
  | Array<RawType>
  | Map<RawType, RawType>
  | Set<RawType>
  | { [key: string]: RawType };

export type NamedEntries<T> = [string | null, T][];
export type NamedObject<T> = { [key: string]: T };

/**
 * RObjData is a union of the JavaScript types that are able to be converted
 * into an R object.
 *
 * RObjData is used both as a general input argument for R object construction
 * and also as a general return type when converting R objects into JavaScript.
 *
 * The type parameter, T, chooses how references to R objects are implemented.
 * This is required because there are different ways to represent a reference to
 * an R object in webR. Instances of the RWorker.RObject class are used on the
 * worker thread, while proxies of type RObject targeting a WebRPayloadPtr
 * object are used on the main thread. Conversion between the reference types is
 * handled automatically during proxy communication.
 */
export type RObjData<T = RWorker.RObject> =
  | RawType
  | T
  | RObjTree<T>
  | RObjData<T>[]
  | { [key: string]: RObjData<T> };

/**
 * A subset of {@link RObjData} for JavaScript objects that can be converted
 * into R atomic vectors. The parameter T is the JavaScript scalar type
 * associated with the vector.
 */
export type RObjAtomicData<T> = T | (T | null)[] | RObjTreeAtomic<T> | NamedObject<T | null>;

/**
 * Test for an RObject instance
 *
 * RObject is the user facing interface to R objects.
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RObject.
 */
export function isRObject(value: any): value is RObject {
  return (
    value &&
    (typeof value === 'object' || typeof value === 'function') &&
    'payloadType' in value &&
    isWebRPayloadPtr(value._payload)
  );
}

/**
 * Test for an RFunction instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RFunction.
 */
export function isRFunction(value: any): value is RFunction {
  return Boolean(isRObject(value) && value._payload.obj.methods?.includes('exec'));
}

/**
 * Test if an object is of type Complex
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is of type Complex.
 */
export function isComplex(value: any): value is Complex {
  return value && typeof value === 'object' && 're' in value && 'im' in value;
}
