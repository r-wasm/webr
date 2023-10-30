import { WebR } from '../../webR/webr-main';
import { RInteger, RLogical, RRaw } from '../../webR/robj-main';
import { mkdtemp, rmdir, unlink, writeFile } from 'fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const webR = new WebR({
  baseUrl: '../dist/',
  RArgs: ['--quiet'],
});

beforeAll(async () => {
  await webR.init();
});

describe('Download and install binary webR packages', () => {
  test('Install packages via evalR', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {});
    await webR.evalR(
      'webr::install("cli", repos="https://repo.r-wasm.org/", mount = FALSE)'
    );
    const pkg = (await webR.evalR('"cli" %in% library(cli)')) as RLogical;
    expect(await pkg.toBoolean()).toEqual(true);
    warnSpy.mockRestore();
  });

  test('Install packages quietly', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {});
    await webR.evalR(
      'webr::install("Matrix", repos="https://repo.r-wasm.org/", mount = FALSE, quiet = TRUE)'
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('Install packages via API', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {});
    await webR.installPackages(['MASS'], { mount: false });
    const pkg = (await webR.evalR('"MASS" %in% library(MASS)')) as RLogical;
    expect(await pkg.toBoolean()).toEqual(true);
    warnSpy.mockRestore();
  });
});

describe('Test webR virtual filesystem', () => {
  const testFileContents = new Uint8Array([1, 2, 4, 7, 11, 16, 22, 29, 37, 46]);
  test('Upload a file to the VFS', async () => {
    await expect(webR.FS.writeFile('/tmp/testFile', testFileContents)).resolves.not.toThrow();
    const readFile = (await webR.evalR('readBin("/tmp/testFile", "raw", 10)')) as RRaw;
    expect(Array.from(await readFile.toArray())).toEqual(Array.from(testFileContents));
  });

  test('Download a file from the VFS', async () => {
    const fileContents = await webR.FS.readFile('/tmp/testFile');
    expect(fileContents).toStrictEqual(testFileContents);
  });

  test('Receive information about a file on the VFS', async () => {
    const fileInfo = await webR.FS.lookupPath('/tmp/testFile');
    expect(fileInfo).toHaveProperty('name', 'testFile');
    expect(fileInfo).toHaveProperty('isFolder', false);
  });

  test('Delete a file on the VFS', async () => {
    await expect(webR.FS.unlink('/tmp/testFile')).resolves.not.toThrow();
    const dirInfo = await webR.FS.lookupPath('/tmp');
    expect(Object.keys(dirInfo.contents!)).not.toContain('testFile');
  });

  test('Create a new directory on the VFS', async () => {
    await expect(webR.FS.mkdir('/newdir')).resolves.not.toThrow();
    const dirInfo = webR.FS.lookupPath('/newdir');
    expect(await dirInfo).toHaveProperty('name', 'newdir');
    expect(await dirInfo).toHaveProperty('isFolder', true);
  });

  test('Receive information about a directory on the VFS', async () => {
    const fileInfo = await webR.FS.lookupPath('/newdir');
    expect(fileInfo).toHaveProperty('name', 'newdir');
    expect(fileInfo).toHaveProperty('isFolder', true);
  });

  test('Remove a directory on the VFS', async () => {
    await expect(webR.FS.rmdir('/newdir')).resolves.not.toThrow();
    const dirInfo = await webR.FS.lookupPath('/');
    expect(Object.keys(dirInfo.contents!)).not.toContain('newdir');
  });

  test('Mount and unmount a directory on the VFS', async () => {
    const fileData = new Uint8Array([4, 6, 6, 9, 2, 0, 1, 6, 0, 9]);

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'temp-'));
    await writeFile(path.join(tmpDir, 'testFile.dat'), fileData);

    await expect(webR.FS.mkdir('/mnt')).resolves.not.toThrow();
    await expect(webR.FS.mount('NODEFS', { root: tmpDir }, '/mnt')).resolves.not.toThrow();
    const readFile = (await webR.evalR('readBin("/mnt/testFile.dat", "raw", 10)')) as RRaw;
    expect(Array.from(await readFile.toArray())).toEqual(Array.from(fileData));

    // Cleanup
    await expect(webR.FS.unmount('/mnt')).resolves.not.toThrow();
    await expect(webR.FS.rmdir('/mnt')).resolves.not.toThrow();
    await unlink(path.join(tmpDir, 'testFile.dat'));
    await rmdir(tmpDir);
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
