import * as Synclink from 'synclink';
import { WebRBackend, WebROptions } from './webR';
import { AsyncQueue } from './queue';

type WebRInput = {
  type: string;
  data: any;
};

export class WebR implements WebRBackend {
  #worker;
  #backend;

  #busy = false;
  #inputQueue = new AsyncQueue<WebRInput>();

  constructor() {
    this.#worker = new Worker('./webR.js');
    this.#backend = Synclink.wrap(this.#worker) as WebRBackend;
  }

  async init(options: WebROptions = {}) {
    let getConsoleInputCallback: any = Synclink.proxy(async () => {
      let input = await this.#inputQueue.get();
      return input.data;
    })
    return this.#backend.init(options, getConsoleInputCallback);
  }

  isBusy() {
    return this.#busy;
  }

  putConsoleInput(input: string) {
    this.#inputQueue.put({ type: 'text', data: input });
    this.#busy = true;
  };

  // Backend delegation
  async runRCode(code: string) { return this.#backend.runRCode(code) };
  async readOutput() { return this.#backend.readOutput() };
  async putFileData(name: string, data: Uint8Array) { return this.#backend.putFileData(name, data) }
  async getFileData(name: string) { return this.#backend.getFileData(name) }
  async getFSNode(path: string) { return this.#backend.getFSNode(path) }
  async loadPackages(packages: string[]) { return this.#backend.loadPackages(packages) }
  async isLoaded(pkg: string) { return this.#backend.isLoaded(pkg) }
}
