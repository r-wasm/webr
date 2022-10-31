import { WebR } from '../../../webR/webr-main';
import { Message } from '../../../webR/chan/message';
import { ChannelType } from '../../../webR/chan/channel';

const webR = new WebR({
  channelType: ChannelType.PostMessage,
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
});

describe('Test communication works with postMessage based channel', () => {
  test('Initialises successfully', async () => {
    await expect(webR.init()).resolves.not.toThrow();
  });

  test('Wait for a prompt', async () => {
    let msg: Message = await webR.read();
    while (msg.type !== 'prompt') {
      msg = await webR.read();
    }
    expect(msg.data).toBe('> ');
  });

  test('Write an R command to the console', () => {
    expect(() => webR.writeConsole('42\n')).not.toThrow();
  });

  test('Read result line from stdout', async () => {
    expect((await webR.read()).data).toBe('[1] 42');
  });
});

afterAll(() => {
  return webR.close();
});
