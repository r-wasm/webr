import { WebR } from '../../webR/webr-main';
import util from 'util';

const webR = new WebR({
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
});

jest.setTimeout(25000);

beforeAll(async () => {
  await webR.init();
});

test('Evaluate code and return a proxy', async () => {
  const result = await webR.evalRCode('42');
  expect(util.types.isProxy(result)).toBe(true);
});

test('RProxy _target property', async () => {
  const result = await webR.evalRCode('42');
  expect(result._target).toHaveProperty('type', 'PTR');
  expect(result._target).toHaveProperty('methods');
  expect(result._target).toHaveProperty('obj');
  expect(result._target.obj).toEqual(expect.any(Number));
});

afterAll(() => {
  return webR.close();
});
