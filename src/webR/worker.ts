/*
 * Start webR in a JavaScript web worker, using functions provided by the
 * WebRWorker module.
 */

import { newChannelWorker, ChannelInitMessage } from './chan/channel-common';
import { Message } from './chan/message';
import { IN_NODE } from './compat';
import { workerInit } from './webr-worker';

let initialised = false;

const onWorkerMessage = function (msg: Message) {
  if (!msg || !msg.type || msg.type !== 'init') {
    return;
  }
  if (initialised) {
    throw new Error("Can't initialise worker multiple times.");
  }
  const messageInit = msg as ChannelInitMessage;
  const workerChannel = newChannelWorker(messageInit);
  workerInit(messageInit.data.config, workerChannel);
  initialised = true;
};

if (IN_NODE) {
  require('worker_threads').parentPort.on('message', onWorkerMessage);
  (globalThis as any).XMLHttpRequest = require('xmlhttprequest-ssl')
    .XMLHttpRequest as XMLHttpRequest;
} else {
  globalThis.onmessage = (ev: MessageEvent<Message>) => onWorkerMessage(ev.data);
}
