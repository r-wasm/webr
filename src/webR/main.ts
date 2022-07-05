import * as Synclink from 'synclink';
import { WebRBackend, WebRBackendPrivate, WebROptions } from './webR';
import { Message, ChannelMain, chanWorkerHandle } from './channel';


export class WebR implements WebRBackend {
  #worker;
  #workerProxy;

  #chan = new ChannelMain();

  constructor() {
    this.#worker = new Worker('./webR.js');
    this.#workerProxy = Synclink.wrap(this.#worker) as WebRBackendPrivate;
  }

  async init(options: WebROptions = {}) {
    await this.#workerProxy.init(options, chanWorkerHandle(this.#chan));
    return this.#chan.initialised;
  }

  async read(): Promise<Message> {
    return await this.#chan.read();
  }

  write(msg: Message) {
    this.#chan.write(msg);
  }
  writeConsole(input: string) {
    this.write({ type: 'stdin', data: input });
  };

  // Backend delegation
  async runRCode(code: string) { return this.#workerProxy.runRCode(code) };
  async putFileData(name: string, data: Uint8Array) { return this.#workerProxy.putFileData(name, data) }
  async getFileData(name: string) { return this.#workerProxy.getFileData(name) }
  async getFSNode(path: string) { return this.#workerProxy.getFSNode(path) }
}
