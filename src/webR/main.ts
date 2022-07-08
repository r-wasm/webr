import { WebROptions,
         FSNode } from './webR';
import { ChannelMain } from './channel';
import { Message} from './message';


export class WebR {
  #chan;

  constructor(options: WebROptions = {}) {
    this.#chan = new ChannelMain('./webR.js', options);
  }

  async init() {
    return await this.#chan.initialised;
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
  async runRCode(_code: string) { return 'TODO'; };
}
