import { ChannelMain } from './chan/channel';
import { Message} from './chan/message';
import { RProxy } from './sexp';

export type FSNode = {
  id: number;
  name: string;
  mode: number;
  isFolder: boolean;
  contents: { [key: string]: FSNode };
};

export interface WebROptions {
  RArgs?: string[];
  REnv?: { [key: string]: string };
  WEBR_URL?: string;
  PKG_URL?: string;
  homedir?: string;
}

export class WebR {
  #chan;

  constructor(options: WebROptions = {}) {
    this.#chan = new ChannelMain('./webr-worker.js', options);
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
  async evalRCode(code: string): Promise<RProxy> {
    return await this.#chan.request({ type: "evalRCode", data: { code: code }});
  }

  // Backend delegation
  async runRCode(_code: string) { return 'TODO'; };
}
