import { WebR } from '../../webR/webr-main';
import { RFunction } from '../../webR/robj';
import util from 'util';

const webR = new WebR({
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
});

beforeAll(async () => {
  await webR.init();
});

test('Evaluate code and return a proxy', async () => {
  const result = (await webR.evalRCode('42')).result;
  expect(util.types.isProxy(result)).toBe(true);
});

test('RProxy _target property', async () => {
  const result = (await webR.evalRCode('42')).result;
  expect(result._target).toHaveProperty('type', 'PTR');
  expect(result._target).toHaveProperty('methods');
  expect(result._target).toHaveProperty('obj');
  expect(result._target.obj).toEqual(expect.any(Number));
});

test('RFunctions can be invoked via the proxy apply hook', async () => {
  const fn = (await webR.evalRCode('factorial')).result as RFunction;
  const result = (await fn(8)) as number[];
  expect(result[0]).toEqual(40320);
});

test('RFunctions can be returned by R functions and invoked via the apply hook', async () => {
  const fn = (await webR.evalRCode('function(x) function (y) {x*y}')).result as RFunction;
  const invoke = (await fn(5)) as RFunction;
  const result = (await invoke(7)) as number[];
  expect(result[0]).toEqual(35);
});

test('Other R objects cannot use the apply hook', async () => {
  const notFn = await webR.evalRCode('123');
  // @ts-expect-error Deliberate type error to test Error thrown
  expect(() => notFn(8)).toThrow('is not a function');
});

afterAll(() => {
  return webR.close();
});
