import { WebR } from '../../webR/webr-main';
import { RLogical, RRaw } from '../../webR/robj';

const webR = new WebR({
  WEBR_URL: '../dist/',
  RArgs: ['--quiet'],
});

jest.setTimeout(25000);

beforeAll(async () => {
  await webR.init();
});

describe('Download and install binary webR packages', () => {
  test('Install packages via evalRCode', async () => {
    await webR.evalRCode('webr::install("cli", repos="https://repo.webr.workers.dev/")');
    const pkg = (await webR.evalRCode('"cli" %in% library(cli)')) as RLogical;
    expect(await pkg.toLogical()).toEqual(true);
  });

  test('Install packages via API', async () => {
    await webR.installPackages(['MASS']);
    const pkg = (await webR.evalRCode('"MASS" %in% library(MASS)')) as RLogical;
    expect(await pkg.toLogical()).toEqual(true);
  });
});

describe('Test webR virtual filesystem', () => {
  const testFileContents = new Uint8Array([1, 2, 4, 7, 11, 16, 22, 29, 37, 46]);
  test('Upload a file to the VFS', async () => {
    await expect(webR.putFileData('/tmp/testFile', testFileContents)).resolves.not.toThrow();
    const readFile = (await webR.evalRCode('readBin("/tmp/testFile", "raw", 10)')) as RRaw;
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

afterAll(() => {
  return webR.close();
});
