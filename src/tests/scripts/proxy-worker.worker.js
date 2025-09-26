const { parentPort } = require('node:worker_threads');

parentPort.onmessage = () => {
  parentPort.postMessage("pong");
};
