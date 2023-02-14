import { WebRDataRaw, RPtr, RType } from './robj';

export type WebRPayloadRaw = {
  obj: WebRDataRaw;
  payloadType: 'raw';
};

export type WebRPayloadPtr = {
  obj: {
    type?: RType;
    ptr: RPtr;
    methods?: string[];
  };
  payloadType: 'ptr';
};

export type WebRPayloadErr = {
  obj: {
    message: string;
    name: string;
    stack?: string;
  };
  payloadType: 'err';
};

// On the main side we shouldn't see any error payload as these are
// rethrown as JS exceptions
export type WebRPayload = WebRPayloadRaw | WebRPayloadPtr;
export type WebRPayloadWorker = WebRPayloadRaw | WebRPayloadPtr | WebRPayloadErr;

export function webRPayloadError(payload: WebRPayloadErr): Error {
  const e = new Error(payload.obj.message);
  e.name = payload.obj.name;
  e.stack = payload.obj.stack;
  return e;
}

/**
 * Test for an WebRPayload instance.
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an WebRPayload.
 */
export function isWebRPayload(value: any): value is WebRPayload {
  return value && typeof value === 'object' && 'payloadType' in value && 'obj' in value;
}

/**
 * Test for an WebRPayloadPtr instance.
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an WebRPayloadPtr.
 */
export function isWebRPayloadPtr(value: any): value is WebRPayloadPtr {
  return isWebRPayload(value) && value.payloadType === 'ptr';
}

/**
 * Test for an WebRPayloadRaw instance.
 *
 * @param {any} value The object to test.
 * @return {boolean} True if the object is an instance of an WebRPayloadRaw.
 */
export function isWebRPayloadRaw(value: any): value is WebRPayloadRaw {
  return isWebRPayload(value) && value.payloadType === 'raw';
}
