/**
 * Internal virtual filesystem image mounting functionality.
 * @module Mount
 */

import { ungzip } from 'pako';
import { Module } from './emscripten';
import { IN_NODE } from './compat';
import type { FSMountOptions, FSMetaData } from './webr-main';
import type { readFileSync } from 'fs';

type WorkerFileSystemType = Emscripten.FileSystemType & {
  reader: { readAsArrayBuffer: (chunk: any) => ArrayBuffer },
  FILE_MODE: number
  createNode: (dir: FS.FSNode, file: string, mode: number, dev: number,
    contents: ArrayBufferView, mtime?: Date) => FS.FSNode;
};

/**
 * Download an Emscripten FS image and mount to the VFS
 * @internal
 */
export function mountImageUrl(url: string, mountpoint: string) {
  if (/\.tgz$|\.tar\.gz$|\.tar$/.test(url)) {
    // New (v2.0) VFS format - metadata appended to package
    const dataResp = Module.downloadFileContent(url);
    if (dataResp.status < 200 || dataResp.status >= 300) {
      throw new Error("Can't download Emscripten filesystem image.");
    }
    const { data, metadata } = decodeVFSArchive(dataResp.response as ArrayBuffer);
    mountImageData(data, metadata, mountpoint);
  } else {
    // Legacy (v1.0) VFS format - from Emscripten's file_packager
    const urlBase = url.replace(/\.data\.gz$|\.data$|\.js.metadata$/, '');
    const metaResp = Module.downloadFileContent(`${urlBase}.js.metadata`);
    if (metaResp.status < 200 || metaResp.status >= 300) {
      throw new Error("Can't download Emscripten filesystem image metadata.");
    }

    const metadata = JSON.parse(
      new TextDecoder().decode(metaResp.response as ArrayBuffer)
    ) as FSMetaData;

    const ext = metadata.gzip ? '.data.gz' : '.data';
    const dataResp = Module.downloadFileContent(`${urlBase}${ext}`);
    if (dataResp.status < 200 || dataResp.status >= 300) {
      throw new Error("Can't download Emscripten filesystem image data.");
    }

    // Decompress filesystem data, if required
    let data = dataResp.response as ArrayBuffer;
    if (metadata.gzip) {
      data = ungzip(data).buffer;
    }
    mountImageData(data, metadata, mountpoint);
  }
}

/**
 * Read an Emscripten FS image from disk and mount to the VFS (requires Node)
 * @internal
 */
export function mountImagePath(path: string, mountpoint: string) {
  const fs = require('fs') as {
    readFileSync: typeof readFileSync;
  };

  if (/\.tgz$|\.tar\.gz$|\.tar$/.test(path)) {
    // New (v2.0) VFS format - metadata appended to package
    const buffer = fs.readFileSync(path);
    const { data, metadata } = decodeVFSArchive(buffer);
    mountImageData(data, metadata, mountpoint);
  } else {
    // Legacy (v1.0) VFS format - from Emscripten's file_packager
    const pathBase = path.replace(/\.data\.gz$|\.data$|\.js.metadata$/, '');
    const metadata = JSON.parse(
      fs.readFileSync(`${pathBase}.js.metadata`, 'utf8')
    ) as FSMetaData;

    const ext = metadata.gzip ? '.data.gz' : '.data';
    let data: ArrayBufferLike = fs.readFileSync(`${pathBase}${ext}`);

    // Decompress filesystem data, if required
    if (metadata.gzip) {
      data = ungzip(data).buffer;
    }
    mountImageData(data, metadata, mountpoint);
  }
}

/**
 * An implementation of FS.mount() for WORKERFS under Node.js
 * @internal
 */
export function mountFSNode(type: Emscripten.FileSystemType, opts: FSMountOptions, mountpoint: string) {
  if (!IN_NODE || type !== Module.FS.filesystems.WORKERFS) {
    return Module.FS._mount(type, opts, mountpoint) as void;
  }

  if ('packages' in opts && opts.packages) {
    opts.packages.forEach((pkg) => {
      // Main thread communication casts `Blob` to Uint8Array
      // FIXME: Use a replacer + reviver to handle `Blob`s
      mountImageData(pkg.blob as ArrayBufferLike, pkg.metadata, mountpoint);
    });
  } else {
    throw new Error(
      "Can't mount data under Node. " +
      "Mounting with `WORKERFS` under Node must use the `packages` key."
    );
  }
}

// Mount the filesystem image `data` and `metadata` to the VFS at `mountpoint`
function mountImageData(data: ArrayBufferLike | Buffer, metadata: FSMetaData, mountpoint: string) {
  if (IN_NODE) {
    const buf = Buffer.from(data);
    const WORKERFS = Module.FS.filesystems.WORKERFS as WorkerFileSystemType;

    if (!WORKERFS.reader) WORKERFS.reader = {
      readAsArrayBuffer: (chunk: Buffer) => new Uint8Array(chunk),
    };

    metadata.files.forEach((f: { filename: string, start: number, end: number }) => {
      const contents: Buffer & { size?: number } = buf.subarray(f.start, f.end);
      contents.size = contents.byteLength;
      contents.slice = (start?: number, end?: number) => {
        const sub: Buffer & { size?: number } = contents.subarray(start, end);
        sub.size = sub.byteLength;
        return sub;
      };
      const parts = (mountpoint + f.filename).split('/');
      const file = parts.pop();
      if (!file) {
        throw new Error(`Invalid mount path "${mountpoint}${f.filename}".`);
      }
      const dir = parts.join('/');
      Module.FS.mkdirTree(dir);
      const dirNode = Module.FS.lookupPath(dir, {}).node;
      WORKERFS.createNode(dirNode, file, WORKERFS.FILE_MODE, 0, contents);
    });
  } else {
    Module.FS.mount(Module.FS.filesystems.WORKERFS, {
      packages: [{
        blob: new Blob([data]),
        metadata,
      }],
    }, mountpoint);
  }
}

// Decode archive data and metadata encoded in v2.0 VFS image
function decodeVFSArchive(data: ArrayBufferLike) {
  const buffer = ungzip(data).buffer;
  const view = new DataView(buffer);
  const magic = view.getInt32(view.byteLength - 16);
  // const reserved = view.getInt32(view.byteLength - 12);
  const block = view.getInt32(view.byteLength - 8);
  const len = view.getInt32(view.byteLength - 4);

  if (magic !== 2003133010 || block === 0 || len === 0) {
    throw new Error("Can't mount archive, no VFS metadata found.");
  }

  const bytes = new DataView(buffer, 512 * block, len);
  const metadata = JSON.parse(new TextDecoder().decode(bytes)) as FSMetaData;
  return { data: buffer, metadata };
}
