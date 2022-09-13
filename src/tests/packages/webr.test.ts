import { WebR } from '../../webR/webr-main';
import { RDouble, RLogical } from '../../webR/robj';

const webR = new WebR({
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
  interactive: false,
});

beforeAll(async () => {
  await webR.init();
  // Install packages required to run all package examples and tests
  await webR.installPackages(['Matrix', 'MASS']);
});

test('The webr R package is installed', async () => {
  const pkg = (await webR.evalRCode('"webr" %in% installed.packages()')).result as RLogical;
  expect(await pkg.toLogical()).toEqual(true);
});

describe('Run R default package examples and tests', () => {
  test('datasets', async () => {
    const test = (await webR.evalRCode('webr::test_package("datasets")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('tools', async () => {
    const test = (await webR.evalRCode('webr::test_package("tools")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('utils', async () => {
    const test = (await webR.evalRCode('webr::test_package("utils")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('grDevices', async () => {
    const test = (await webR.evalRCode('webr::test_package("grDevices")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('graphics', async () => {
    const test = (await webR.evalRCode('webr::test_package("graphics")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('stats', async () => {
    const test = (await webR.evalRCode('webr::test_package("stats")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('stats4', async () => {
    const test = (await webR.evalRCode('webr::test_package("stats4")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('splines', async () => {
    const test = (await webR.evalRCode('webr::test_package("splines")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('methods', async () => {
    const test = (await webR.evalRCode('webr::test_package("methods")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('compiler', async () => {
    const test = (await webR.evalRCode('webr::test_package("compiler")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('base', async () => {
    const test = (await webR.evalRCode('webr::test_package("base")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });

  test('grid', async () => {
    await webR.evalRCode('options(expressions=5000)');
    const test = (await webR.evalRCode('webr::test_package("grid")')).result as RDouble;
    expect(await test.toNumber()).toEqual(0);
  });
});

afterAll(() => {
  return webR.close();
});
