import { WebR } from '../../../webR/webr-main';
import { RRaw } from '../../../webR/robj-main';
import { ChannelType } from '../../../webR/chan/channel-common';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 7780 });
wss.on('connection', function connection(ws) {
  ws.on('message', function message() {
    ws.send([42]);
    ws.close();
  });
});

const webR = new WebR({
  channelType: ChannelType.SharedArrayBuffer,
  baseUrl: '../dist/',
  RArgs: ['--quiet'],
});

describe('Communicate over WebSocket proxy', () => {
  test('Initialises successfully', async () => {
    await expect(webR.init()).resolves.not.toThrow();
  });

  test('Use WebSockets from webR worker thread', async () => {
    await webR.init();
    const res = (await webR.evalR(`
      webr::eval_js('
        const client = new WebSocket("ws://localhost:7780");
        client.onopen = (ev) => {
          client.send([0]);
        };
        client.onmessage = (ev) => {
          globalThis.gotReply = ev.data;
        };
        globalThis.gotReply = null;
      ')

      while (is.na(webr::eval_js("globalThis.gotReply"))) {
        Sys.sleep(1)
      }
      webr::eval_js("globalThis.gotReply")
    `)) as RRaw;
    expect(await res.toNumber()).toEqual(42);
  });
});

afterAll(() => {
  wss.close();
  return webR.close();
});
