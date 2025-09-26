import { WebR } from '../../../webR/webr-main';
import { ChannelType } from '../../../webR/chan/channel-common';

const webR = new WebR({
  channelType: ChannelType.SharedArrayBuffer,
  baseUrl: '../dist/',
  RArgs: ['--quiet'],
});

describe('Communicate over Worker proxy', () => {
  test('Initialises successfully', async () => {
    await expect(webR.init()).resolves.not.toThrow();
  });

  test('Use Worker from webR worker thread', async () => {
    await webR.init();
    const res = (await webR.evalRString(`
      webr::eval_js('
        var worker = new Worker("./tests/scripts/proxy-worker.worker.js");
        worker.onmessage = (ev) => globalThis.gotReply = ev.data;
        worker.postMessage("ping");
        globalThis.gotReply = null;
      ')

      while (is.na(webr::eval_js("globalThis.gotReply"))) {
        Sys.sleep(1)
      }

      webr::eval_js("worker.terminate()")
      webr::eval_js("globalThis.gotReply")
    `));
    expect(res).toEqual("pong");
  });
});

afterAll(() => {
  return webR.close();
});
