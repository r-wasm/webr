import { ChannelMain } from "./channel";
import { SharedBufferChannelWorker } from "./channel-shared";
import { generateUUID } from "./task-common";
import { IN_NODE } from '../compat';

export interface WebSocketProxy extends WebSocket {
  uuid: string;
  _accept(): void;
  _recieve(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  _close(code?: number, reason?: string): void;
}

export class WebSocketMap {
  WebSocket: typeof WebSocket;
  #map = new Map<string, WebSocket>();

  constructor(readonly chan: ChannelMain) {
    this.WebSocket = IN_NODE ? require('ws').WebSocket as typeof WebSocket : WebSocket;
  }

  new(uuid: string, url: string | URL, protocols?: string | string[]) {
    const ws = new this.WebSocket(url, protocols);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      this.chan.emit({ type: 'websocket-open', data: { uuid } });
    };

    ws.onmessage = (ev: MessageEvent) => {
      const data = new Uint8Array(ev.data as ArrayBufferLike);
      this.chan.emit({ type: 'websocket-message', data: { uuid, data } });
    };

    ws.onclose = (ev: CloseEvent) => {
      this.chan.emit({ type: 'websocket-close', data: { uuid, code: ev.code, reason: ev.reason } });
    };

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
        chan.proxies.set(this.uuid, this);
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
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }

      _recieve(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        if (this.onmessage) {
          this.onmessage(new MessageEvent('message', { data }));
        }
      }

      _close(code?: number, reason?: string): void {
        if (this.onclose) {
          this.onclose(new CloseEvent('close', { code, reason }));
        }
        chan.proxies.delete(this.uuid);
      }
    };
  }
}
