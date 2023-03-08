/**
 * Module for working with R objects on the main thead through
 * JavaScript proxies. The `RObject` types in `RMain` are aliases for
 * proxies to the corresponding types in `RWorker`. For instance,
 * `RMain.RCharacter` is an alias for `RMain.RProxy<RWorker.RCharacter>`.
 * The proxies automatically and asynchronously forward method and
 * getter calls to the implementations on the R worker side.
 * @module RMain
 */
import type { RProxy } from './proxy';
import { isWebRPayloadPtr } from './payload';
import * as RWorker from './robj-worker';

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
export type RCall = RProxy<RWorker.RCall>;
// RFunction proxies are callable
export type RFunction = RProxy<RWorker.RFunction> & ((...args: unknown[]) => Promise<unknown>);

/**
 * Test for an RObject instance
 *
 * RObject is the user facing interface to R objects.
 *
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RObject.
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
 * @returns {boolean} True if the object is an instance of an RFunction.
 */
export function isRFunction(value: any): value is RFunction {
  return Boolean(isRObject(value) && value._payload.obj.methods?.includes('exec'));
}
