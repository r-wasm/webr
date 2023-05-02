// Original code from Synclink and Comlink. Released under Apache 2.0.

import {
  Endpoint,
  SZ_BUF_DOESNT_FIT,
  SZ_BUF_FITS_IDX,
  SZ_BUF_SIZE_IDX,
  UUID_LENGTH,
} from './task-common';

import { newSyncRequest, Message } from './message';
import { decode } from '@msgpack/msgpack';

const decoder = new TextDecoder('utf-8');

export class SyncTask {
  endpoint: Endpoint;
  msg: Message;
  transfers: Transferable[];

  #scheduled = false;
  #resolved: boolean;
  #result?: any;
  #exception?: any;

  // sync only
  taskId?: number;
  #syncGen?: Generator<void, unknown, void>;
  sizeBuffer?: Int32Array;
  signalBuffer?: Int32Array;
  syncifier = new _Syncifier();

  constructor(endpoint: Endpoint, msg: Message, transfers: Transferable[] = []) {
    this.endpoint = endpoint;
    this.msg = msg;
    this.transfers = transfers;
    this.#resolved = false;
  }

  scheduleSync() {
    if (this.#scheduled) {
      return;
    }
    this.#scheduled = true;

    this.syncifier.scheduleTask(this);
    this.#syncGen = this.doSync();
    this.#syncGen.next();
    return this;
  }

  poll() {
    if (!this.#scheduled) {
      throw new Error('Task not synchronously scheduled');
    }

    const { done, value } = this.#syncGen!.next();
    if (!done) {
      return false;
    }

    this.#resolved = true;
    this.#result = value;

    return true;
  }

  *doSync() {
    // just use syncRequest.
    const { endpoint, msg, transfers } = this;
    const sizeBuffer = new Int32Array(new SharedArrayBuffer(8));
    const signalBuffer = this.signalBuffer!;
    const taskId = this.taskId;

    // Ensure status is cleared. We will notify
    let dataBuffer = acquireDataBuffer(UUID_LENGTH);
    // console.log("===requesting", taskId);

    const syncMsg = newSyncRequest(msg, {
      sizeBuffer,
      dataBuffer,
      signalBuffer,
      taskId,
    });

    endpoint.postMessage(syncMsg, transfers);
    yield;

    if (Atomics.load(sizeBuffer, SZ_BUF_FITS_IDX) === SZ_BUF_DOESNT_FIT) {
      // There wasn't enough space, make a bigger dataBuffer.
      // First read uuid for response out of current dataBuffer
      const id = decoder.decode(dataBuffer.slice(0, UUID_LENGTH));
      releaseDataBuffer(dataBuffer);
      const size = Atomics.load(sizeBuffer, SZ_BUF_SIZE_IDX);
      dataBuffer = acquireDataBuffer(size);
      // console.log("===bigger data buffer", taskId);
      endpoint.postMessage({ id, dataBuffer });
      yield;
    }

    const size = Atomics.load(sizeBuffer, SZ_BUF_SIZE_IDX);
    // console.log("===completing", taskId);
    return decode(dataBuffer.slice(0, size));
  }

  get result() {
    if (this.#exception) {
      throw this.#exception;
    }
    // console.log(this.#resolved);
    if (this.#resolved) {
      return this.#result as unknown;
    }
    throw new Error('Not ready.');
  }

  syncify(): any {
    this.scheduleSync();
    this.syncifier.syncifyTask(this);
    return this.result;
  }
}

class _Syncifier {
  nextTaskId: Int32Array;
  signalBuffer: Int32Array;
  tasks: Map<number, SyncTask>;

  constructor() {
    this.nextTaskId = new Int32Array([1]);
    this.signalBuffer = new Int32Array(new SharedArrayBuffer(32 * 4 + 4));
    this.tasks = new Map();
  }

  scheduleTask(task: SyncTask) {
    task.taskId = this.nextTaskId[0];
    this.nextTaskId[0] += 2;
    task.signalBuffer = this.signalBuffer;
    this.tasks.set(task.taskId, task);
  }

  waitOnSignalBuffer() {
    const timeout = 50;
    for (;;) {
      const status = Atomics.wait(this.signalBuffer, 0, 0, timeout);
      switch (status) {
        case 'ok':
        case 'not-equal':
          return;
        case 'timed-out':
          if (interruptBuffer[0] !== 0) {
            handleInterrupt();
          }
          break;
        default:
          throw new Error('Unreachable');
      }
    }
  }

  *tasksIdsToWakeup() {
    const flag = Atomics.load(this.signalBuffer, 0);
    for (let i = 0; i < 32; i++) {
      const bit = 1 << i;
      if (flag & bit) {
        Atomics.and(this.signalBuffer, 0, ~bit);
        const wokenTask = Atomics.exchange(this.signalBuffer, i + 1, 0);
        yield wokenTask;
      }
    }
  }

  pollTasks(task?: SyncTask) {
    let result = false;
    for (const wokenTaskId of this.tasksIdsToWakeup()) {
      // console.log("poll task", wokenTaskId, "looking for",task);
      const wokenTask = this.tasks.get(wokenTaskId);
      if (!wokenTask) {
        throw new Error(`Assertion error: unknown taskId ${wokenTaskId}.`);
      }
      if (wokenTask.poll()) {
        // console.log("completed task ", wokenTaskId, wokenTask, wokenTask._result);
        this.tasks.delete(wokenTaskId);
        if (wokenTask === task) {
          result = true;
        }
      }
    }
    return result;
  }

  syncifyTask(task: SyncTask) {
    for (;;) {
      this.waitOnSignalBuffer();
      // console.log("syncifyTask:: woke");
      if (this.pollTasks(task)) {
        return;
      }
    }
  }
}

const dataBuffers: Uint8Array[][] = [];

function acquireDataBuffer(size: number): Uint8Array {
  const powerof2 = Math.ceil(Math.log2(size));
  if (!dataBuffers[powerof2]) {
    dataBuffers[powerof2] = [];
  }
  const result = dataBuffers[powerof2].pop();
  if (result) {
    result.fill(0);
    return result;
  }
  return new Uint8Array(new SharedArrayBuffer(2 ** powerof2));
}

function releaseDataBuffer(buffer: Uint8Array) {
  const powerof2 = Math.ceil(Math.log2(buffer.byteLength));
  dataBuffers[powerof2].push(buffer);
}

let interruptBuffer = new Int32Array(new ArrayBuffer(4));

let handleInterrupt = (): void => {
  interruptBuffer[0] = 0;
  throw new Error('Interrupted!');
};

/**
 * Sets the interrupt handler. This is called when the computation is
 * interrupted. Should zero the interrupt buffer and throw an exception.
 * @internal
 */
export function setInterruptHandler(handler: () => void) {
  handleInterrupt = handler;
}

/**
 * Sets the interrupt buffer. Should be a shared array buffer. When element 0
 * is set non-zero it signals an interrupt.
 * @internal
 */
export function setInterruptBuffer(buffer: ArrayBufferLike) {
  interruptBuffer = new Int32Array(buffer);
}
