import { AsyncQueue } from './queue';
import { promiseHandles, ResolveFn, newCrossOriginWorker, isCrossOrigin } from '../utils';
import { Message, newRequest, Response, Request, newResponse } from './message';
import { Endpoint } from './task-common';
import { ChannelType } from './channel';

import { IN_NODE } from '../compat';
import type { Worker as NodeWorker } from 'worker_threads';
if (IN_NODE) {
  (globalThis as any).Worker = require('worker_threads').Worker as NodeWorker;
}

// Main ----------------------------------------------------------------

export class PostMessageChannelMain {
  inputQueue = new AsyncQueue<Message>();
  outputQueue = new AsyncQueue<Message>();

  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;
  close = () => {};

  #parked = new Map<string, ResolveFn>();
  #worker?: Worker;

  constructor(url: string, config: unknown) {
    const initWorker = (worker: Worker) => {
      this.#worker = worker;
      this.#handleEventsFromWorker(worker);
      this.close = () => worker.terminate();
      const msg = {
        type: 'init',
        data: { config, channelType: ChannelType.PostMessage },
      } as Message;
      worker.postMessage(msg);
    };

    if (isCrossOrigin(url)) {
      newCrossOriginWorker(url, (worker: Worker) => initWorker(worker));
    } else {
      const worker = new Worker(url);
      initWorker(worker);
    }

    console.warn(
      'Warning: webR is running in PostMessage mode and some webR features will be unavailable.',
      'For performance reasons and in the interest of user experience we highly recommend',
      'using webR in SharedArrayBuffer mode.'
    );

    ({ resolve: this.resolve, promise: this.initialised } = promiseHandles());
  }

  async read() {
    return await this.outputQueue.get();
  }

  async flush() {
    const msg: Message[] = [];
    while (!this.outputQueue.isEmpty()) {
      msg.push(await this.read());
    }
    return msg;
  }

  interrupt() {
    console.error('Interrupting R execution is not available in PostMessage mode');
  }

  write(msg: Message) {
    this.inputQueue.put(msg);
  }

  async request(msg: Message, transferables?: [Transferable]): Promise<any> {
    const req = newRequest(msg, transferables);

    const { resolve: resolve, promise: prom } = promiseHandles();
    this.#parked.set(req.data.uuid, resolve);

    this.write(req);
    return prom;
  }

  #resolveResponse(msg: Response) {
    const uuid = msg.data.uuid;
    const resolve = this.#parked.get(uuid);

    if (resolve) {
      this.#parked.delete(uuid);
      resolve(msg.data.resp);
    } else {
      console.warn("Can't find request.");
    }
  }

  #handleEventsFromWorker(worker: Worker) {
    if (IN_NODE) {
      (worker as unknown as NodeWorker).on('message', (message: Message) => {
        this.#onMessageFromWorker(worker, message);
      });
    } else {
      worker.onmessage = (ev: MessageEvent) =>
        this.#onMessageFromWorker(worker, ev.data as Message);
    }
  }

  #onMessageFromWorker = async (worker: Worker, message: Message) => {
    if (!message || !message.type) {
      return;
    }

    switch (message.type) {
      case 'resolve':
        this.resolve();
        return;

      case 'response':
        this.#resolveResponse(message as Response);
        return;

      default:
        this.outputQueue.put(message);
        return;

      case 'request': {
        const msg = message as Request;
        const payload = msg.data.msg;

        switch (payload.type) {
          case 'read': {
            const input = await this.inputQueue.get();
            if (this.#worker) {
              const response = newResponse(msg.data.uuid, input);
              this.#worker.postMessage(response);
            }
            break;
          }
          default:
            throw new TypeError(`Unsupported request type '${payload.type}'.`);
        }
        return;
      }

      case 'sync-request':
        throw new TypeError(
          "Can't send messages of type 'sync-request' in PostMessage mode. Use 'request' instead."
        );
    }
  };
}

// Worker --------------------------------------------------------------

import { Module as _Module } from '../module';

declare let Module: _Module;

export class PostMessageChannelWorker {
  #ep: Endpoint;
  #dispatch: (msg: Message) => void = () => 0;
  #promptDepth = 0;
  #parked = new Map<string, ResolveFn>();

  constructor() {
    this.#ep = (IN_NODE ? require('worker_threads').parentPort : globalThis) as Endpoint;
  }

  resolve() {
    this.write({ type: 'resolve' });
  }

  write(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage(msg, transfer);
  }

  read(): Message {
    throw new Error('Unable to synchronously read from channel in PostMessage mode');
  }

  inputOrDispatch(): number {
    if (this.#promptDepth++ > 0) {
      throw new Error('Nested REPL prompts are not available in PostMessage mode');
    }
    return 0;
  }

  run(_args: string[]) {
    const args: string[] = _args || [];
    args.unshift('R');
    const argc = args.length;
    const argv = Module._malloc(4 * (argc + 1));
    args.forEach((arg, idx) => {
      const argvPtr = argv + 4 * idx;
      const argPtr = Module.allocateUTF8(arg);
      Module.setValue(argvPtr, argPtr, '*');
    });
    Module._Rf_initialize_R(argc, argv);
    Module._setup_Rmainloop();
    Module._R_ReplDLLinit();
    Module._R_ReplDLLdo1();
    this.#asyncREPL();
  }

  setDispatchHandler(dispatch: (msg: Message) => void) {
    this.#dispatch = dispatch;
  }

  async request(msg: Message, transferables?: [Transferable]): Promise<any> {
    const req = newRequest(msg, transferables);

    const { resolve: resolve, promise: prom } = promiseHandles();
    this.#parked.set(req.data.uuid, resolve);

    this.write(req);
    return prom;
  }

  setInterrupt(interrupt: () => void) {}

  handleInterrupt() {}

  onMessageFromMainThread(message: Message) {
    const msg = message as Response;
    const uuid = msg.data.uuid;
    const resolve = this.#parked.get(uuid);

    if (resolve) {
      this.#parked.delete(uuid);
      resolve(msg.data.resp);
    } else {
      console.warn("Can't find request.");
    }
  }

  /*
   * This is a fallback REPL for webR running in PostMessage mode. The prompt
   * section of R's R_ReplDLLdo1 returns empty with -1, which allows this
   * fallback REPL to yield to the event loop with await.
   *
   * The drawback of this approach is that nested REPLs do not work, such as
   * realine, browser or menu. Attempting to use a nested REPL throws an error.
   *
   * R errors during exectuion are caught and the REPL is restarted at the top
   * level. Any other errors are re-thrown.
   */
  #asyncREPL = async () => {
    // Enter async REPL
    for (;;) {
      this.#promptDepth = 0;
      const msg = (await this.request({ type: 'read' })) as Message;
      if (msg.type === 'stdin') {
        // Copy the new input into WASM memory
        const str = Module.allocateUTF8(msg.data as string);
        Module._strcpy(Module._DLLbuf, str);
        Module.setValue(Module._DLLbufp, Module._DLLbuf, '*');
        Module._free(str);

        // Execute the R code. On error, return to top level prompt
        try {
          while (Module._R_ReplDLLdo1() > 0);
        } catch (e: any) {
          Module._R_ReplDLLinit();
          Module._R_ReplDLLdo1();
          if (e !== Infinity) {
            throw e;
          }
        }
      } else {
        this.#dispatch(msg);
      }
    }
  };
}
