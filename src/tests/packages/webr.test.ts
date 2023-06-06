import { WebR } from '../../webR/webr-main';
import { RDouble, RLogical } from '../../webR/robj-main';

const webR = new WebR({
  baseUrl: '../dist/',
  RArgs: ['--quiet'],
  interactive: false,
});

async function evalTest(pkg: string) {
  return (await webR.evalR(`webr::test_package("${pkg}")`)) as RDouble;
}

beforeAll(async () => {
  await webR.init();
  // Install packages required to run all package examples and tests
  await webR.installPackages(['Matrix', 'MASS'], true);
});

test('The webr R package is installed', async () => {
  const pkg = (await webR.evalR('"webr" %in% installed.packages()')) as RLogical;
  expect(await pkg.toBoolean()).toEqual(true);
});

describe('Run R default package examples and tests', () => {
  test('datasets', async () => {
    const test = await evalTest('datasets');
    expect(await test.toNumber()).toEqual(0);
  });

  test('tools', async () => {
    const test = await evalTest('tools');
    expect(await test.toNumber()).toEqual(0);
  });

  test('utils', async () => {
    const test = await evalTest('utils');
    expect(await test.toNumber()).toEqual(0);
  });

  test('grDevices', async () => {
    const test = await evalTest('grDevices');
    expect(await test.toNumber()).toEqual(0);
  });

  test('graphics', async () => {
    const test = await evalTest('graphics');
    expect(await test.toNumber()).toEqual(0);
  });

  test('stats', async () => {
    const test = await evalTest('stats');
    expect(await test.toNumber()).toEqual(0);
  });

  test('stats4', async () => {
    const test = await evalTest('stats4');
    expect(await test.toNumber()).toEqual(0);
  });

  test('splines', async () => {
    const test = await evalTest('splines');
    expect(await test.toNumber()).toEqual(0);
  });

  test('methods', async () => {
    const test = await evalTest('methods');
    expect(await test.toNumber()).toEqual(0);
  });

  test('compiler', async () => {
    const test = await evalTest('compiler');
    expect(await test.toNumber()).toEqual(0);
  });

  test('base', async () => {
    const test = await evalTest('base');
    expect(await test.toNumber()).toEqual(0);
  });

  test('grid', async () => {
    await webR.evalR('options(expressions=5000)');
    await webR.evalR('graphics.off()');
    const test = await evalTest('grid');
    expect(await test.toNumber()).toEqual(0);
  });
});

afterAll(() => {
  return webR.close();
});
