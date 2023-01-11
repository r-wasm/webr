import { RawType, RPtr, RType } from './robj';

export type WebRPayloadRaw = {
  obj: RawType;
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
export type WebRPayload = WebRPayloadRaw | WebRPayloadPtr | WebRPayloadErr;

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
