import { FSMetaData, WebR } from '../../webR/webr-main';
import fs from 'fs';

const webR = new WebR({
  baseUrl: '../dist/',
  RArgs: ['--quiet'],
});

beforeAll(async () => {
  await webR.init();
  await webR.evalRVoid('dir.create("/mnt")');
});

async function cleanupMnt() {
  try {
    await webR.FS.unmount("/mnt");
  } catch (e) {
    const err = e as Error;
    // Disregard any filesystem errors caused by attempting to unmount
    if (!err.message.includes("ErrnoError")) {
      throw err;
    }
  }
}

describe('Mount filesystem using R API', () => {
  test('Mount v1.0 filesystem image', async () => {
    await expect(webR.evalRVoid(
      'webr::mount("/mnt", "tests/webR/data/test_image.data", "workerfs")'
    )).resolves.not.toThrow();
    expect(await webR.evalRString("list.files('/mnt/abc')[2]")).toEqual("foo.csv");
    expect(await webR.evalRString("readLines('/mnt/abc/bar.csv')[1]")).toEqual("a, b, c");
    await cleanupMnt();
  });

  test('Mount v2.0 filesystem image', async () => {
    await expect(webR.evalRVoid(
      'webr::mount("/mnt", "tests/webR/data/test_image.tar.gz", "workerfs")'
    )).resolves.not.toThrow();
    expect(await webR.evalRString("list.files('/mnt/abc')[2]")).toEqual("foo.csv");
    expect(await webR.evalRString("readLines('/mnt/abc/bar.csv')[1]")).toEqual("a, b, c");
    await cleanupMnt();
  });

  test('Mount v2.0 filesystem image - no metadata hint', async () => {
    await expect(webR.evalRVoid(
      'webr::mount("/mnt", "tests/webR/data/test_image_no_hint.tgz", "workerfs")'
    )).resolves.not.toThrow();
    expect(await webR.evalRString("list.files('/mnt/abc')[2]")).toEqual("foo.csv");
    expect(await webR.evalRString("readLines('/mnt/abc/bar.csv')[1]")).toEqual("a, b, c");
    await cleanupMnt();
  });

  test('Mount filesystem image from URL', async () => {
    const url = "https://repo.r-wasm.org/bin/emscripten/contrib/4.4/cli_3.6.3.js.metadata";
    await expect(webR.evalRVoid(`
      webr::mount("/mnt", "${url}", "workerfs")
    `)).resolves.not.toThrow();
    expect(await webR.evalRString("readLines('/mnt/DESCRIPTION')[1]")).toEqual("Package: cli");
    await cleanupMnt();
  });

  test('Mount NODEFS filesystem type', async () => {
    await expect(webR.evalRVoid(`
      webr::mount("/mnt", "tests/webR/data/testing", "nodefs")
    `)).resolves.not.toThrow();
    expect(await webR.evalRString("readLines('/mnt/foo.csv')[2]")).toEqual("1, 2, 3");
    await cleanupMnt();
  });
});

describe('Mount filesystem using JS API', () => {
  test('Mount filesystem image using Buffer', async () => {
    const data = fs.readFileSync("tests/webR/data/test_image.data");
    const buf = fs.readFileSync("tests/webR/data/test_image.js.metadata");
    const metadata = JSON.parse(new TextDecoder().decode(buf)) as FSMetaData;
    await expect(
      webR.FS.mount("WORKERFS", { packages: [{ blob: data, metadata: metadata }] }, '/mnt')
    ).resolves.not.toThrow();
    expect(await webR.evalRString("list.files('/mnt/abc')[2]")).toEqual("foo.csv");
    expect(await webR.evalRString("readLines('/mnt/abc/bar.csv')[1]")).toEqual("a, b, c");
    await cleanupMnt();
  });

  test('Mount filesystem image using Blob', async () => {
    const data = new Blob([fs.readFileSync("tests/webR/data/test_image.data")]);
    const buf = fs.readFileSync("tests/webR/data/test_image.js.metadata");
    const metadata = JSON.parse(new TextDecoder().decode(buf)) as FSMetaData;
    await expect(
      webR.FS.mount("WORKERFS", { packages: [{ blob: data, metadata: metadata }] }, '/mnt')
    ).resolves.not.toThrow();
    expect(await webR.evalRString("list.files('/mnt/abc')[2]")).toEqual("foo.csv");
    expect(await webR.evalRString("readLines('/mnt/abc/bar.csv')[1]")).toEqual("a, b, c");
    await cleanupMnt();
  });

  test('Mount NODEFS filesystem type', async () => {
    await expect(
      webR.FS.mount("NODEFS", { root: 'tests/webR/data/testing' }, '/mnt')
    ).resolves.not.toThrow();
    expect(await webR.evalRString("readLines('/mnt/foo.csv')[2]")).toEqual("1, 2, 3");
    await cleanupMnt();
  });
});
