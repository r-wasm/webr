import { WebRDataTree, WebRDataTreeAtomic } from './tree';
import * as RMain from './robj-main';
import * as RWorker from './robj-worker';

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

export type WebRDataRaw =
  | number
  | string
  | boolean
  | undefined
  | null
  | Complex
  | Error
  | ArrayBuffer
  | ArrayBufferView
  | Array<WebRDataRaw>
  | Map<WebRDataRaw, WebRDataRaw>
  | Set<WebRDataRaw>
  | { [key: string]: WebRDataRaw };

export type NamedEntries<T> = [string | null, T][];
export type NamedObject<T> = { [key: string]: T };

/**
 * WebRData is a union of the JavaScript types that are able to be converted
 * into an R object.
 *
 * WebRData is used both as a general input argument for R object construction
 * and also as a general return type when converting R objects into JavaScript.
 */
export type WebRData =
  | RMain.RObject
  | RWorker.RObjectBase
  | RWorker.RObject
  | WebRDataRaw
  | WebRDataTree
  | WebRData[]
  | { [key: string]: WebRData };

/**
 * A subset of WebRData for JavaScript objects that can be converted into R
 * atomic vectors. The parameter T is the JavaScript scalar type associated with
 * the vector.
 */
export type WebRDataAtomic<T> =
  | WebRDataScalar<T>
  | (T | null)[]
  | WebRDataTreeAtomic<T>
  | NamedObject<T | null>;

/**
 * A subset of WebRData for scalar JavaScript objects.
 */
export type WebRDataScalar<T> = T | RMain.RObject | RWorker.RObjectBase;

/**
 * Test if an object is of type Complex
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is of type Complex.
 */
export function isComplex(value: any): value is Complex {
  return value && typeof value === 'object' && 're' in value && 'im' in value;
}
