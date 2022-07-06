import * as Synclink from 'synclink';
import { WebRBackend,
         WebRBackendPrivate,
         WebROptions,
         FSNode } from './webR';
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

  async putFileData(name: string, data: Uint8Array) {
    let msg = { type: "putFileData", data: { name: name, data: data }};
    return await this.#chan.request(msg);
  }
  async getFileData(name: string): Promise<Uint8Array> {
    return await this.#chan.request({ type: "getFileData", data: { name: name }});
  }
  async getFSNode(path: string): Promise<FSNode> {
    return await this.#chan.request({ type: "getFSNode", data: { path: path }});
  }

  // Backend delegation
  async runRCode(code: string) { return this.#workerProxy.runRCode(code) };
}
