import { WebR } from '../../webR/webr-main';

const webR = new WebR({
  baseUrl: '../dist/',
  RArgs: ['--quiet'],
});

beforeAll(async () => {
  await webR.init();
});

test('webr package tests succeed', async () => {
  const out = await webR.evalR('webr:::self_test()');
  expect(await out.type()).toEqual('null');
});

afterAll(() => {
  return webR.close();
});
