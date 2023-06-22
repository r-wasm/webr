/**
 * Custom Error classes that shall be raised by webR.
 * @module Error
 */

/**
 * A general error raised by webR.
 */
export class WebRError extends Error {
  constructor(msg: string) {
      super(msg);
      this.name = this.constructor.name;
      Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Exceptions raised on the webR worker thread that have been forwarded to the
 * main thread through the communication channel.
 */
export class WebRWorkerError extends WebRError {}

/**
 * Exceptions related to issues with the webR communication channel.
 */
export class WebRChannelError extends WebRError {}

/**
 * Exceptions related to issues with webR object payloads.
 */
export class WebRPayloadError extends WebRError {}
