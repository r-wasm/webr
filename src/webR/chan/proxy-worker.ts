import { newCrossOriginWorker } from "../utils";
import { ChannelMain } from "./channel";
import { SharedBufferChannelWorker } from "./channel-shared";
import { generateUUID } from "./task-common";

export interface WorkerProxy extends Worker {
  uuid: string;
  _message(data: any): void;
  _messageerror(data: any): void;
  _error(): void;
}

// Main --------------------------------------------------------------

export class WorkerMap {
  #map = new Map<string, Worker>();

  constructor(readonly chan: ChannelMain) {}

  new(uuid: string, url: string, options?: WorkerOptions) {
    newCrossOriginWorker(
      url,
      (worker: Worker) => {
        worker.addEventListener('message', (ev: MessageEvent<unknown>) => {
          this.chan.emit({ type: 'worker-message', data: { uuid, data: ev.data } });
        });
  
        worker.addEventListener('messageerror', (ev: MessageEvent<unknown>) => {
          this.chan.emit({ type: 'worker-messageerror', data: { uuid, data: ev.data } });
        });

        worker.addEventListener('error', () => {
          this.chan.emit({ type: 'worker-error', data: { uuid } });
        });

        this.#map.set(uuid, worker);
      },
      (error: Error) => {throw error;},
      options,
      false
    );
  }

  postMessage(uuid: string, data: any, transfer: Transferable[]): void {
    const worker = this.#map.get(uuid);
    worker?.postMessage(data, transfer);
  }

  terminate(uuid: string): void {
    const worker = this.#map.get(uuid);
    worker?.terminate();
    this.#map.delete(uuid);
  }
}


// Worker --------------------------------------------------------------

export class WorkerProxyFactory {
  static proxy(chan: SharedBufferChannelWorker): typeof Worker {
    return class Worker extends EventTarget implements WorkerProxy {
      uuid: string;
      url: string;
      options: WorkerOptions;
      onmessage: ((ev: MessageEvent) => any) | null;
      onmessageerror: ((ev: MessageEvent) => any) | null;
      onerror: ((ev: Event) => any) | null;

      constructor(url: string | URL, options: WorkerOptions = {}) {
        super();
        this.url = String(url);
        this.options = options;
        this.onmessage = null;
        this.onmessageerror = null;
        this.onerror = null;

        this.uuid = generateUUID();

        chan.writeSystem({
          type: 'proxyWorker',
          data: { uuid: this.uuid, url: this.url, options: this.options }
        });
        chan.workers.set(this.uuid, this);
      }

      postMessage(data: unknown, transfer?: Transferable[] | StructuredSerializeOptions): void {
        if (transfer && !Array.isArray(transfer)) {
          transfer = transfer.transfer;
        }
        chan.writeSystem({ type: 'postMessageWorker', data: { uuid: this.uuid, data, transfer } }, transfer);
      }

      terminate(): void {
        chan.writeSystem({ type: 'terminateWorker', data: { uuid: this.uuid } });
      }

      _message(data: unknown): void {
        const ev = new MessageEvent('message', { data });
        this.dispatchEvent(ev);
        this.onmessage?.(ev);
      }

      _messageerror(data: unknown): void {
        const ev = new MessageEvent('message', { data });
        this.dispatchEvent(ev);
        this.onmessageerror?.(ev);
      }

      _error(): void {
        const ev = new Event("error");
        this.dispatchEvent(ev);
        this.onerror?.(ev);
      }
    };
  }
}
