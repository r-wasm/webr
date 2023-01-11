import * as RWorker from './robj-worker';
import * as RMain from './robj-worker';
import { WebRDataRaw, RPtr, RTypeMap } from './robj';

/**
 * WebRDataTree objects form a tree structure, used when serialising
 * R objects into a JavaScript respresentation.
 *
 * Nested R objects are serialised using the WebRDataTreeNode type, forming
 * branches in the resulting tree structure, with leaves formed by the
 * remaining types.
 */
export type WebRDataTree =
  | WebRDataTreeNull
  | WebRDataTreeString
  | WebRDataTreeSymbol
  | WebRDataTreeNode
  | WebRDataTreeAtomic<RWorker.atomicType>;

export type WebRDataTreeNull = {
  type: 'null';
};
export type WebRDataTreeString = {
  type: 'string';
  value: string;
};
export type WebRDataTreeSymbol = {
  type: 'symbol';
  printname: string | null;
  symvalue: RPtr | null;
  internal: RPtr | null;
};
export type WebRDataTreeNode = {
  type: 'list' | 'pairlist' | 'environment';
  names: (string | null)[] | null;
  values: (WebRDataRaw | RWorker.RObject | RMain.RObject | WebRDataTree)[];
};
export type WebRDataTreeAtomic<T> = {
  type: 'logical' | 'integer' | 'double' | 'complex' | 'character' | 'raw';
  names: (string | null)[] | null;
  values: (T | null)[];
};

/**
 * Test for a WebRDataTree instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of a WebRDataTree.
 */
export function isWebRDataTree(value: any): value is WebRDataTree {
  return value && typeof value === 'object' && Object.keys(RTypeMap).includes(value.type as string);
}
