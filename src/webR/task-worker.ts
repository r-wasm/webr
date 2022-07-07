// Original code from Synclink and Comlink. Released under Apache 2.0.

import { Endpoint,
         SZ_BUF_DOESNT_FIT,
         SZ_BUF_FITS_IDX,
         SZ_BUF_SIZE_IDX,
         UUID_LENGTH } from './task-common'

let decoder = new TextDecoder("utf-8");


export class SyncTask {
  endpoint: Endpoint;
  msg: any;
  transfers: Transferable[];

  #scheduled = false;
  #resolved: boolean;
  #result?: any;
  #exception?: any;

  // sync only
  taskId?: number;
  _sync_gen?: Generator<void, any, void>;
  size_buffer?: Int32Array;
  signal_buffer?: Int32Array;

  constructor(endpoint: Endpoint,
              msg: any,
              transfers: Transferable[] = []) {
    this.endpoint = endpoint;
    this.msg = msg;
    this.transfers = transfers;
    this.#resolved = false;
  }

  schedule_sync() {
    if (this.#scheduled) {
      return;
    }
    this.#scheduled = true;

    Syncifier.scheduleTask(this);
    this._sync_gen = this.do_sync();
    this._sync_gen.next();
    return this;
  }

  poll() {
    if (!this.#scheduled) {
      throw new Error("Task not synchronously scheduled");
    }

    let { done, value } = this._sync_gen!.next();
    if (!done) {
      return false;
    }

    this.#resolved = true;
    this.#result = value;

    return true;
  }

  *do_sync() {
    // just use syncRequest.
    let { endpoint, msg, transfers } = this;
    let size_buffer = new Int32Array(new SharedArrayBuffer(8));
    let signal_buffer = this.signal_buffer!;
    let taskId = this.taskId;
    // Ensure status is cleared. We will notify
    let data_buffer = acquireDataBuffer(UUID_LENGTH);
    // console.log("===requesting", taskId);
    endpoint.postMessage(
      {
        msg,
        size_buffer,
        data_buffer,
        signal_buffer,
        taskId,
        syncify: true,
      },
      transfers
    );
    yield;
    if (Atomics.load(size_buffer, SZ_BUF_FITS_IDX) === SZ_BUF_DOESNT_FIT) {
      // There wasn't enough space, make a bigger data_buffer.
      // First read uuid for response out of current data_buffer
      const id = decoder.decode(data_buffer.slice(0, UUID_LENGTH));
      releaseDataBuffer(data_buffer);
      const size = Atomics.load(size_buffer, SZ_BUF_SIZE_IDX);
      data_buffer = acquireDataBuffer(size);
      // console.log("===bigger data buffer", taskId);
      endpoint.postMessage({ id, data_buffer });
      yield;
    }
    const size = Atomics.load(size_buffer, SZ_BUF_SIZE_IDX);
    // console.log("===completing", taskId);
    return JSON.parse(decoder.decode(data_buffer.slice(0, size)));
  }

  get result() {
    if (this.#exception) {
      throw this.#exception;
    }
    // console.log(this.#resolved);
    if (this.#resolved) {
      return this.#result;
    }
    throw new Error("Not ready.");
  }

  syncify(): any {
    this.schedule_sync();
    Syncifier.syncifyTask(this);
    return this.result;
  }
}

class _Syncifier {
  nextTaskId: Int32Array;
  signal_buffer: Int32Array;
  tasks: Map<number, SyncTask>;

  constructor() {
    this.nextTaskId = new Int32Array([1]);
    this.signal_buffer = new Int32Array(new SharedArrayBuffer(32 * 4 + 4));
    this.tasks = new Map();
  }

  scheduleTask(task: SyncTask) {
    task.taskId = this.nextTaskId[0];
    this.nextTaskId[0] += 2;
    task.signal_buffer = this.signal_buffer;
    this.tasks.set(task.taskId, task);
  }

  waitOnSignalBuffer() {
    let timeout = 50;
    while (true) {
      let status = Atomics.wait(this.signal_buffer, 0, 0, timeout);
      switch (status) {
        case "ok":
        case "not-equal":
          return;
        case "timed-out":
          if (interrupt_buffer[0] !== 0) {
            handleInterrupt();
          }
          break;
        default:
          throw new Error("Unreachable");
      }
    }
  }

  *tasksIdsToWakeup() {
    let flag = Atomics.load(this.signal_buffer, 0);
    for (let i = 0; i < 32; i++) {
      let bit = 1 << i;
      if (flag & bit) {
        Atomics.and(this.signal_buffer, 0, ~bit);
        let wokenTask = Atomics.exchange(this.signal_buffer, i + 1, 0);
        yield wokenTask;
      }
    }
  }

  pollTasks(task?: SyncTask) {
    let result = false;
    for (let wokenTaskId of this.tasksIdsToWakeup()) {
      // console.log("poll task", wokenTaskId, "looking for",task);
      let wokenTask = this.tasks.get(wokenTaskId);
      if (!wokenTask) {
        throw new Error(`Assertion error: unknown taskId ${wokenTaskId}.`);
      }
      if (wokenTask!.poll()) {
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
    while (true) {
      this.waitOnSignalBuffer();
      // console.log("syncifyTask:: woke");
      if (this.pollTasks(task)) {
        return;
      }
    }
  }
}

export let Syncifier = new _Syncifier();


let dataBuffers: Uint8Array[][] = [];

function acquireDataBuffer(size: number): Uint8Array {
  let powerof2 = Math.ceil(Math.log2(size));
  if (!dataBuffers[powerof2]) {
    dataBuffers[powerof2] = [];
  }
  let result = dataBuffers[powerof2].pop();
  if (result) {
    result.fill(0);
    return result;
  }
  return new Uint8Array(new SharedArrayBuffer(2 ** powerof2));
}

function releaseDataBuffer(buffer: Uint8Array) {
  let powerof2 = Math.ceil(Math.log2(buffer.byteLength));
  dataBuffers[powerof2].push(buffer);
}


export let interrupt_buffer = new Int32Array(new SharedArrayBuffer(4));

let handleInterrupt = () => {
  interrupt_buffer[0] = 0;
  throw new Error("Interrupted!");
};

/**
 * Sets the interrupt handler. This is called when the computation is
 * interrupted. Should zero the interrupt buffer and throw an exception.
 * @param handler
 */
export function setInterruptHandler(handler: () => never) {
  handleInterrupt = handler;
}
