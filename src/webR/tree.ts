/**
 * Types for serialising R objects into a JavaScript representation.
 * @module Tree
 */
import * as RWorker from './robj-worker';
import * as RMain from './robj-worker';
import { WebRDataRaw, RPtr, RTypeMap } from './robj';

/**
 * `WebRDataJs` objects form a tree structure, used when serialising R objects
 * into a JavaScript respresentation.
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
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of a {@link WebRDataJs}.
 */
export function isWebRDataJs(value: any): value is WebRDataJs {
  return value && typeof value === 'object' && Object.keys(RTypeMap).includes(value.type as string);
}
