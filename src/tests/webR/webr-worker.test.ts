import { WebR } from '../../webR/webr-main';
import { RInteger, RLogical, RRaw } from '../../webR/robj';

const webR = new WebR({
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
});

beforeAll(async () => {
  await webR.init();
});

describe('Download and install binary webR packages', () => {
  test('Install packages via evalR', async () => {
    await webR.evalR('webr::install("cli", repos="https://repo.webr.workers.dev/")');
    const pkg = (await webR.evalR('"cli" %in% library(cli)')) as RLogical;
    expect(await pkg.toLogical()).toEqual(true);
  });

  test('Install packages via API', async () => {
    await webR.installPackages(['MASS']);
    const pkg = (await webR.evalR('"MASS" %in% library(MASS)')) as RLogical;
    expect(await pkg.toLogical()).toEqual(true);
  });
});

describe('Test webR virtual filesystem', () => {
  const testFileContents = new Uint8Array([1, 2, 4, 7, 11, 16, 22, 29, 37, 46]);
  test('Upload a file to the VFS', async () => {
    await expect(webR.putFileData('/tmp/testFile', testFileContents)).resolves.not.toThrow();
    const readFile = (await webR.evalR('readBin("/tmp/testFile", "raw", 10)')) as RRaw;
    expect(Array.from(await readFile.toArray())).toEqual(Array.from(testFileContents));
  });

  test('Download a file from the VFS', async () => {
    const fileContents = await webR.getFileData('/tmp/testFile');
    expect(fileContents).toStrictEqual(testFileContents);
  });

  test('Receive information about a file on the VFS', async () => {
    const fileInfo = await webR.getFSNode('/tmp/testFile');
    expect(fileInfo).toHaveProperty('name', 'testFile');
    expect(fileInfo).toHaveProperty('isFolder', false);
  });

  test('Receive information about a directory on the VFS', async () => {
    const fileInfo = await webR.getFSNode('/tmp');
    expect(fileInfo).toHaveProperty('name', 'tmp');
    expect(fileInfo).toHaveProperty('isFolder', true);
  });
});

describe('Execute JavaScript code from R', () => {
  test('Execute a JS expression', async () => {
    const res = (await webR.evalR('webr::eval_js("Math.round(Math.sin(24) * 10)")')) as RInteger;
    expect(await res.toNumber()).toEqual(-9);
  });

  test('Raise a JS exception as an R condition', async () => {
    const badSyntax = webR.evalR('webr::eval_js("51+")');
    await expect(badSyntax).rejects.toThrow('Unexpected end of input');
  });

  test('Return types are as expected', async () => {
    /*
     * Return type behaviour should match `emscripten_run_script_int` from
     * Emscripten's C API. Note that the `eval_js` function may change in the
     * future so as to return different types.
     */
    // Integers are returned as is
    const res1 = (await webR.evalR('webr::eval_js("1 + 2")')) as RInteger;
    expect(await res1.toNumber()).toEqual(3);

    // Doubles are truncated to integer
    const res2 = (await webR.evalR('webr::eval_js("Math.E")')) as RInteger;
    expect(await res2.toNumber()).toEqual(2);

    // Other objects are converted to integer 0
    const res3 = (await webR.evalR('webr::eval_js("\'abc\'")')) as RInteger;
    expect(await res3.toNumber()).toEqual(0);
  });
});

afterAll(() => {
  return webR.close();
});
