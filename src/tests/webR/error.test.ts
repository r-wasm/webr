import { WebR, WebRError, WebRWorkerError } from '../../webR/webr-main';

const webR = new WebR({
  baseUrl: '../dist/',
  RArgs: ['--quiet'],
});

beforeAll(async () => {
  await webR.init();
});

test('Errors from webR are instances of WebRError', async () => {
  const problem = webR.evalRNumber('"abc"');
  await expect(problem).rejects.toThrow(WebRError);
  await expect(problem).rejects.toThrow("Can't convert object of type character to number");
});

test('Errors forwarded from the worker thread are instances of WebRWorkerError', async () => {
  const problem = webR.evalR('1+');
  await expect(problem).rejects.toThrow(WebRWorkerError);
  await expect(problem).rejects.toThrow('unexpected end of input');
});

test('Caught WebRError has the expected error name property', async () => {
  let error: Error | undefined;
  try {
    await webR.evalR('1+');
  } catch (e) {
    if (e instanceof WebRError) {
      error = e;
    }
  }
  expect(error).toHaveProperty('name', 'WebRWorkerError');
  expect(error).toHaveProperty('message', expect.stringContaining('unexpected end of input'));
});

afterAll(() => {
  return webR.close();
});
