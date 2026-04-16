import { ChannelMain } from "./channel";
import { SharedBufferChannelWorker } from "./channel-shared";
import { generateUUID } from "./task-common";
import { IN_NODE } from '../compat';

export interface WebSocketProxy extends WebSocket {
  uuid: string;
  _accept(): void;
  _recieve(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  _close(code?: number, reason?: string): void;
  _error(): void;
}

export class WebSocketMap {
  WebSocket: typeof WebSocket;
  #map = new Map<string, WebSocket>();

  constructor(readonly chan: ChannelMain) {
    if (IN_NODE) {
      // Use the built-in WebSocket if available (Node.js >= 21), otherwise
      // fall back to the 'ws' npm package which must be installed separately.
      this.WebSocket = ('WebSocket' in globalThis)
        ? globalThis.WebSocket
        : require('ws') as typeof WebSocket;
    } else {
      this.WebSocket = WebSocket;
    }
  }

  new(uuid: string, url: string | URL, protocols?: string | string[]) {
    const ws = new this.WebSocket(url, protocols || []);
    ws.binaryType = 'arraybuffer';
    
    ws.addEventListener('open', () => {
      this.chan.emit({ type: 'websocket-open', data: { uuid } });
    });

    ws.addEventListener('message', (ev: MessageEvent) => {
      const data = new Uint8Array(ev.data as ArrayBufferLike);
      this.chan.emit({ type: 'websocket-message', data: { uuid, data } });
    });

    ws.addEventListener('close', (ev: CloseEvent) => {
      this.chan.emit({ type: 'websocket-close', data: { uuid, code: ev.code, reason: ev.reason } });
    });

    ws.addEventListener('error', () => {
      this.chan.emit({ type: 'websocket-error', data: { uuid } });
    });

    this.#map.set(uuid, ws);
  }

  send(uuid: string, data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    const ws = this.#map.get(uuid);
    ws?.send(data);
  }

  close(uuid: string, code?: number, reason?: string): void {
    const ws = this.#map.get(uuid);
    ws?.close(code, reason);
    this.#map.delete(uuid);
  }
}

export class WebSocketProxyFactory {
  static proxy(chan: SharedBufferChannelWorker): typeof WebSocket {
    return class WebSocket extends EventTarget implements WebSocketProxy {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;

      readonly CONNECTING = WebSocket.CONNECTING;
      readonly OPEN = WebSocket.OPEN;
      readonly CLOSING = WebSocket.CLOSING;
      readonly CLOSED = WebSocket.CLOSED;

      uuid: string;
      url: string;
      protocol: string;
      readyState: number = WebSocket.CONNECTING;
      bufferedAmount = 0;
      binaryType: BinaryType;
      extensions = "";
      onopen: ((ev: Event) => any) | null;
      onmessage: ((ev: MessageEvent) => any) | null;
      onclose: ((ev: CloseEvent) => any) | null;
      onerror: ((ev: Event) => any) | null;

      constructor(url: string | URL, protocols?: string | string[]) {
        super();
        this.url = String(url);
        this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || '';
        this.binaryType = 'arraybuffer';

        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;

        this.uuid = generateUUID();

        chan.writeSystem({
          type: 'proxyWebSocket',
          data: { uuid: this.uuid, url: this.url, protocol: this.protocol }
        });
        chan.ws.set(this.uuid, this);
      }

      send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        chan.writeSystem({ type: 'sendWebSocket', data: { uuid: this.uuid, data } });
      }

      close(code?: number, reason?: string): void {
        chan.writeSystem({ type: 'closeWebSocket', data: { uuid: this.uuid, code, reason } });
      }

      _accept() {
        if (this.readyState !== 0) {
          return;
        }

        this.readyState = 1;
        const ev = new Event('open');
        this.dispatchEvent(ev);
        this.onopen?.(ev);
      }

      _recieve(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        const ev = new MessageEvent('message', { data });
        this.dispatchEvent(ev);
        this.onmessage?.(ev);
      }

      _close(code?: number, reason?: string): void {
        const ev = new CloseEvent('close', { code, reason });
        this.dispatchEvent(ev);
        this.onclose?.(ev);
        chan.ws.delete(this.uuid);
      }

      _error(): void {
        const ev = new Event("error");
        this.dispatchEvent(ev);
        this.onerror?.(ev);
      }

      // Node.js EventEmitter-style .on() for Emscripten SOCKFS compatibility.
      // In Node.js, SOCKFS registers socket events via .on() rather than
      // .onopen/.onmessage etc., so we must support both APIs.
      on(event: string, handler: (...args: unknown[]) => void): this {
        if (event === 'message') {
          // SOCKFS expects handler(data, isBinary) like the 'ws' npm package
          this.addEventListener('message', (ev: Event) => {
            const data = (ev as MessageEvent<unknown>).data;
            const isBinary = !(typeof data === 'string');
            handler(data, isBinary);
          });
        } else {
          this.addEventListener(event, () => handler());
        }
        return this;
      }
    };
  }
}

// TODO: Remove this once we have nodejs/node#53355
if (IN_NODE) {
  globalThis.CloseEvent = class CloseEvent extends Event {
    wasClean: boolean;
    code: number;
    reason: string;
    constructor(type: string, eventInitDict: CloseEventInit = {}) {
      super(type, eventInitDict as EventInit);

      this.wasClean = eventInitDict.wasClean || false;
      this.code = eventInitDict.code || 0;
      this.reason = eventInitDict.reason || '';
    }
  };
}
