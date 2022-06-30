import { WebRBackend, WebROptions } from './webR';
import { wrap } from 'synclink';

export class WebR implements WebRBackend {
  #worker;
  #backend;

  constructor() {
    this.#worker = new Worker('./webR.js');
    this.#backend = wrap(this.#worker) as WebRBackend;
  }

  // Backend delegation
  async init(options: WebROptions = {}) { return this.#backend.init(options) }
  async runRCode(code: string) { return this.#backend.runRCode(code) };
  async readInput(code: string) { return this.#backend.readInput(code) };
  async readOutput() { return this.#backend.readOutput() };
  async putFileData(name: string, data: Uint8Array) { return this.#backend.putFileData(name, data) }
  async getFileData(name: string) { return this.#backend.getFileData(name) }
  async getFSNode(path: string) { return this.#backend.getFSNode(path) }
  async loadPackages(packages: string[]) { return this.#backend.loadPackages(packages) }
  async isLoaded(pkg: string) { return this.#backend.isLoaded(pkg) }
}
