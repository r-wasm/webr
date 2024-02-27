/**
 * Common module for working with R objects.
 * @module RObject
 */
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
export type RTypeNumber = (typeof RTypeMap)[keyof typeof RTypeMap];

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
  | void
  | Complex
  | Error
  | ArrayBuffer
  | ArrayBufferView
  | ImageBitmap
  | Array<WebRDataRaw>
  | Map<WebRDataRaw, WebRDataRaw>
  | Set<WebRDataRaw>
  | { [key: string]: WebRDataRaw };

export type NamedEntries<T> = [string | null, T][];
export type NamedObject<T> = { [key: string]: T };

/**
 * A union of JavaScript types that are able to be converted into an R object.
 *
 * `WebRData` is used both as a general input argument for R object construction
 * and also as a general return type when converting R objects into JavaScript.
 *
 */
export type WebRData =
  | RMain.RObject
  | RWorker.RObjectBase
  | RWorker.RObject
  | WebRDataRaw
  | WebRDataJs
  | WebRData[]
  | ArrayBuffer
  | ArrayBufferView
  | { [key: string]: WebRData };

/**
 * A subset of {@link WebRData} for JavaScript objects that can be converted
 * into R atomic vectors.
 * @typeParam T The JavaScript scalar type associated with the atomic vector.
 */
export type WebRDataAtomic<T> =
  | WebRDataScalar<T>
  | WebRDataJsAtomic<T>
  | NamedObject<T | null>
  | (T extends number ? ArrayBuffer | ArrayBufferView | (number | null)[] : (T | null)[]);

/**
 * `WebRDataJs` objects form a tree structure, used when serialising R objects
 * into a JavaScript representation.
 *
 * Nested R objects are serialised using the {@link WebRDataJsNode} type,
 * forming branches in the resulting tree structure, with leaves formed by the
 * remaining types.
 */
export type WebRDataJs =
  | WebRDataJsNull
  | WebRDataJsString
  | WebRDataJsSymbol
  | WebRDataJsNode
  | WebRDataJsAtomic<RWorker.atomicType>;

export type WebRDataJsNull = {
  type: 'null';
};

export type WebRDataJsString = {
  type: 'string';
  value: string;
};

export type WebRDataJsSymbol = {
  type: 'symbol';
  printname: string | null;
  symvalue: RPtr | null;
  internal: RPtr | null;
};

export type WebRDataJsNode = {
  type: 'list' | 'pairlist' | 'environment';
  names: (string | null)[] | null;
  values: (WebRDataRaw | RWorker.RObject | RMain.RObject | WebRDataJs)[];
};

export type WebRDataJsAtomic<T> = {
  type: 'logical' | 'integer' | 'double' | 'complex' | 'character' | 'raw';
  names: (string | null)[] | null;
  values: (T | null)[];
};

/**
 * Test for a {@link WebRDataJs} instance.
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of a {@link WebRDataJs}.
 */
export function isWebRDataJs(value: any): value is WebRDataJs {
  return value && typeof value === 'object' && Object.keys(RTypeMap).includes(value.type as string);
}

/**
 * A subset of WebRData for scalar JavaScript objects.
 */
export type WebRDataScalar<T> = T | RMain.RObject | RWorker.RObjectBase;

/**
 * Test if an object is of type {@link Complex}.
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is of type {@link Complex}.
 */
export function isComplex(value: any): value is Complex {
  return value && typeof value === 'object' && 're' in value && 'im' in value;
}
