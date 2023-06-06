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
 * Test for an RNull instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RNull.
 */
export function isRNull(value: any): value is RNull {
  return isRObject(value) && value._payload.obj.type === 'null';
}

/**
 * Test for an RSymbol instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RSymbol.
 */
export function isRSymbol(value: any): value is RSymbol {
  return isRObject(value) && value._payload.obj.type === 'symbol';
}

/**
 * Test for an RPairlist instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RPairlist.
 */
export function isRPairlist(value: any): value is RPairlist {
  return isRObject(value) && value._payload.obj.type === 'pairlist';
}

/**
 * Test for an REnvironment instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an REnvironment.
 */
export function isREnvironment(value: any): value is REnvironment {
  return isRObject(value) && value._payload.obj.type === 'environment';
}

/**
 * Test for an RLogical instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RLogical.
 */
export function isRLogical(value: any): value is RLogical {
  return isRObject(value) && value._payload.obj.type === 'logical';
}

/**
 * Test for an RInteger instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RInteger.
 */
export function isRInteger(value: any): value is RInteger {
  return isRObject(value) && value._payload.obj.type === 'integer';
}

/**
 * Test for an RDouble instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RDouble.
 */
export function isRDouble(value: any): value is RDouble {
  return isRObject(value) && value._payload.obj.type === 'double';
}

/**
 * Test for an RComplex instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RComplex.
 */
export function isRComplex(value: any): value is RComplex {
  return isRObject(value) && value._payload.obj.type === 'complex';
}

/**
 * Test for an RCharacter instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RCharacter.
 */
export function isRCharacter(value: any): value is RCharacter {
  return isRObject(value) && value._payload.obj.type === 'character';
}

/**
 * Test for an RList instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RList.
 */
export function isRList(value: any): value is RList {
  return isRObject(value) && value._payload.obj.type === 'list';
}

/**
 * Test for an RRaw instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RRaw.
 */
export function isRRaw(value: any): value is RRaw {
  return isRObject(value) && value._payload.obj.type === 'raw';
}

/**
 * Test for an RCall instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RCall.
 */
export function isRCall(value: any): value is RCall {
  return isRObject(value) && value._payload.obj.type === 'call';
}

/**
 * Test for an RFunction instance
 * @param {any} value The object to test.
 * @returns {boolean} True if the object is an instance of an RFunction.
 */
export function isRFunction(value: any): value is RFunction {
  return Boolean(isRObject(value) && value._payload.obj.methods?.includes('exec'));
}
