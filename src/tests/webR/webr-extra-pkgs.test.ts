import { WebR } from '../../webR/webr-main';

const webR = new WebR({
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
});

beforeAll(async () => {
  await webR.init();
});

test('webr package tests succeed', async () => {
  // TODO: Use the simpler eval functions that converts R errors to JS
  // exceptions, this way we'll get information about failing tests
  const out = (await webR.evalR('webr:::self_test()')).result;
  expect(await out.type()).toEqual('null');
});

afterAll(() => {
  return webR.close();
});
