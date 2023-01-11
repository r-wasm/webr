import * as RWorker from './robj-worker';
import { RawType, RPtr, RTypeMap } from './robj';
import { atomicType } from './robj-worker';

/**
 * RObjTree is a union of types forming a tree structure, used when serialising
 * R objects into a JavaScript respresentation.
 *
 * Nested R objects are serialised using the RObjTreeNode type, forming branches
 * in the resulting tree structure, with leaves formed by the remaining types.
 */
export type RObjTree<T = RWorker.RObject> =
  | RObjTreeNull
  | RObjTreeString
  | RObjTreeSymbol
  | RObjTreeNode<T>
  | RObjTreeAtomic<atomicType>;

export type RObjTreeNull = {
  type: 'null';
};
export type RObjTreeString = {
  type: 'string';
  value: string;
};
export type RObjTreeSymbol = {
  type: 'symbol';
  printname: string | null;
  symvalue: RPtr | null;
  internal: RPtr | null;
};
export type RObjTreeNode<T = RWorker.RObject> = {
  type: 'list' | 'pairlist' | 'environment';
  names: (string | null)[] | null;
  values: (RawType | T | RObjTree<T>)[];
};
export type RObjTreeAtomic<T> = {
  type: 'logical' | 'integer' | 'double' | 'complex' | 'character' | 'raw';
  names: (string | null)[] | null;
  values: (T | null)[];
};

/**
 * Test for an RObjTree instance
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an RObjTree.
 */
export function isRObjTree(value: any): value is RObjTree<any> {
  return value && typeof value === 'object' && Object.keys(RTypeMap).includes(value.type as string);
}
