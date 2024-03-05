import { promiseHandles, ResolveFn, newCrossOriginWorker, isCrossOrigin } from '../utils';
import { Message, newRequest, Response, Request, newResponse } from './message';
import { Endpoint } from './task-common';
import { ChannelType } from './channel-common';
import { WebROptions } from '../webr-main';
import { ChannelMain } from './channel';
import { WebRChannelError } from '../error';

import { IN_NODE } from '../compat';
import type { Worker as NodeWorker } from 'worker_threads';
if (IN_NODE) {
  (globalThis as any).Worker = require('worker_threads').Worker as NodeWorker;
}

// Main ----------------------------------------------------------------

export class PostMessageChannelMain extends ChannelMain {

  initialised: Promise<unknown>;
  resolve: (_?: unknown) => void;
  close: () => void = () => { return; };
  #worker?: Worker;

  constructor(config: Required<WebROptions>) {
    super();
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

    if (isCrossOrigin(config.baseUrl)) {
      newCrossOriginWorker(`${config.baseUrl}webr-worker.js`, (worker: Worker) =>
        initWorker(worker)
      );
    } else {
      const worker = new Worker(`${config.baseUrl}webr-worker.js`);
      initWorker(worker);
    }

    ({ resolve: this.resolve, promise: this.initialised } = promiseHandles());
  }

  interrupt() {
    console.error('Interrupting R execution is not available when using the PostMessage channel');
  }

  #handleEventsFromWorker(worker: Worker) {
    if (IN_NODE) {
      (worker as unknown as NodeWorker).on('message', (message: Message) => {
        void this.#onMessageFromWorker(worker, message);
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
        this.resolveResponse(message as Response);
        return;

      case 'system':
        this.systemQueue.put(message.data as Message);
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
            throw new WebRChannelError(`Unsupported request type '${payload.type}'.`);
        }
        return;
      }

      case 'sync-request':
        throw new WebRChannelError(
          "Can't send messages of type 'sync-request' in PostMessage mode. Use 'request' instead."
        );
    }
  };
}

// Worker --------------------------------------------------------------

import { Module as _Module } from '../emscripten';

declare let Module: _Module;

export class PostMessageChannelWorker {
  #ep: Endpoint;
  #parked = new Map<string, ResolveFn>();
  #dispatch: (msg: Message) => void = () => 0;
  #promptDepth = 0;

  constructor() {
    this.#ep = (IN_NODE ? require('worker_threads').parentPort : globalThis) as Endpoint;
  }

  resolve() {
    this.write({ type: 'resolve' });
  }

  write(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage(msg, transfer);
  }

  writeSystem(msg: Message, transfer?: [Transferable]) {
    this.#ep.postMessage({ type: 'system', data: msg }, transfer);
  }

  read(): Message {
    throw new WebRChannelError(
      'Unable to synchronously read when using the `PostMessage` channel.'
    );
  }

  inputOrDispatch(): number {
    if (this.#promptDepth > 0) {
      this.#promptDepth = 0;
      const msg = Module.allocateUTF8OnStack(
        "Can't block for input when using the PostMessage communication channel."
      );
      Module._Rf_error(msg);
    }
    this.#promptDepth++;
    // Unable to block, so just return a NULL
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

    this.writeSystem({
      type: 'console.warn',
      data: 'WebR is using `PostMessage` communication channel, nested R REPLs are not available.',
    });

    Module._Rf_initialize_R(argc, argv);
    Module._setup_Rmainloop();
    Module._R_ReplDLLinit();
    Module._R_ReplDLLdo1();
    void this.#asyncREPL();
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

  setInterrupt() { return; }
  handleInterrupt() { return; }

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
   * readline, browser or menu. Attempting to use a nested REPL prints an error
   * to the JS console.
   *
   * R/Wasm errors during execution are caught and the REPL is restarted at the
   * top level. Any other JS errors are re-thrown.
   */
  #asyncREPL = async () => {
    for (; ;) {
      try {
        this.#promptDepth = 0;
        const msg = (await this.request({ type: 'read' })) as Message;
        if (msg.type === 'stdin') {
          // Copy the new input into WASM memory
          const str = Module.allocateUTF8(msg.data as string);
          Module._strcpy(Module._DLLbuf, str);
          Module.setValue(Module._DLLbufp, Module._DLLbuf, '*');
          Module._free(str);

          // Execute the R code using a single step of R's built in REPL
          try {
            while (Module._R_ReplDLLdo1() > 0);
          } catch (e: any) {
            if (e instanceof (WebAssembly as any).Exception) {
              // R error: clear command buffer and reproduce prompt
              Module._R_ReplDLLinit();
              Module._R_ReplDLLdo1();
            } else {
              throw e;
            }
          }
        } else {
          this.#dispatch(msg);
        }
      } catch (e) {
        // Don't break the REPL loop on any other Wasm issues
        if (!(e instanceof (WebAssembly as any).Exception)) {
          throw e;
        }
      }
    }
  };
}
