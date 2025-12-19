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
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => null);

    // Downloading and extracting a .tgz package
    await webR.evalR(
      'webr::install("cli", mount = FALSE)'
    );
    let pkg = (await webR.evalR('"cli" %in% library(cli)')) as RLogical;
    expect(await pkg.toBoolean()).toEqual(true);

    // Downloading and mounting an Emscripten FS image
    await webR.evalR(
      'webr::install("lattice", mount = TRUE)'
    );
    pkg = (await webR.evalR('"lattice" %in% library(lattice)')) as RLogical;
    expect(await pkg.toBoolean()).toEqual(true);

    warnSpy.mockRestore();
  });

  test('Install packages quietly', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => null);
    await webR.evalR(
      'webr::install("Matrix", mount = FALSE, quiet = TRUE)'
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('Install packages via API', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => null);
    await webR.installPackages(['MASS'], { mount: false });
    const pkg = (await webR.evalR('"MASS" %in% library(MASS)')) as RLogical;
    expect(await pkg.toBoolean()).toEqual(true);
    warnSpy.mockRestore();
  });

  test('Install packages via package shim', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => null);
    const pkg = (await webR.evalR(`
      webr::shim_install()
      "rlang" %in% library("rlang", character.only = TRUE, show_menu = FALSE, quiet = TRUE)
    `)) as RLogical;
    expect(await pkg.toBoolean()).toEqual(true);
    warnSpy.mockRestore();
  });

  test('Install packages from R-universe involving URL redirect', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => null);
    const pkg = (await webR.evalR(`
      stopifnot(! "boot" %in% installed.packages()[, "Package"])
      webr::shim_install()
      install.packages("boot", repos = "https://cran.r-universe.dev")
      "boot" %in% installed.packages()[, "Package"]
    `)) as RLogical;
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

  test('Rename a file on the VFS', async () => {
    await expect(webR.FS.writeFile('/tmp/foo', testFileContents)).resolves.not.toThrow();
    await expect(webR.FS.rename('/tmp/foo', '/tmp/bar')).resolves.not.toThrow();
    const fileInfo = await webR.FS.lookupPath('/tmp/bar');
    expect(fileInfo).toHaveProperty('name', 'bar');
    expect(fileInfo).toHaveProperty('isFolder', false);
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

  test('Analyze a directory on the VFS', async () => {
    const fileInfo = await webR.FS.analyzePath('/newdir');
    expect(fileInfo).toHaveProperty('object');
    expect(fileInfo.object).toHaveProperty('name', 'newdir');
    expect(fileInfo.object).toHaveProperty('isFolder', true);
  });

  test('Remove a directory on the VFS', async () => {
    await expect(webR.FS.rmdir('/newdir')).resolves.not.toThrow();
    const dirInfo = await webR.FS.lookupPath('/');
    expect(Object.keys(dirInfo.contents!)).not.toContain('newdir');
  });

  test('Analyze a non-existent directory on the VFS', async () => {
    const fileInfo = await webR.FS.analyzePath('/newdir');
    expect(fileInfo).toHaveProperty('exists', false);
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
     * JavaScript objects are converted to R objects using the `RObject` generic
     * constructor. Other R object types can be returned by explicitly invoking
     * another constructor. Note that the `eval_js` function may change in the
     * future so as to return different types.
     */
    const res1 = (await webR.evalR('webr::eval_js("123 + 456") == 579')) as RLogical;
    expect(await res1.toBoolean()).toBeTruthy();

    const res2 = (await webR.evalR(`
      abs(webr::eval_js("Math.sin(1)") - sin(1)) < .Machine$double.eps
    `)) as RLogical;
    expect(await res2.toBoolean()).toBeTruthy();

    const res3 = (await webR.evalR('webr::eval_js("true")')) as RLogical;
    expect(await res3.toBoolean()).toBeTruthy();

    const res4 = (await webR.evalR('is.null(webr::eval_js("undefined"))')) as RLogical;
    expect(await res4.toBoolean()).toBeTruthy();

    const res5 = (await webR.evalR(`
      class(webr::eval_js("(new Date()).toUTCString()")) == "character"
    `)) as RLogical;
    expect(await res5.toBoolean()).toBeTruthy();

    const res6 = (await webR.evalR(`
      list <- webr::eval_js("new RList({ foo: 123, bar: 456, baz: ['a', 'b', 'c']})")
      all(list$foo == 123, list$bar == 456, list$baz[[2]] == "b")
    `)) as RLogical;
    expect(await res6.toBoolean()).toBeTruthy();

  });

  test('Await a JS Promise', async () => {
    const res = (await webR.evalR('webr::eval_js("Promise.resolve(-42)", await = TRUE)')) as RInteger;
    expect(await res.toNumber()).toEqual(-42);
  });
});

afterAll(() => {
  return webR.close();
});
