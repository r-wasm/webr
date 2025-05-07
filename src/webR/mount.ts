/**
 * Internal virtual filesystem image mounting functionality.
 * @module Mount
 */

import { ungzip } from 'pako';
import { Module } from './emscripten';
import { IN_NODE } from './compat';
import { DriveFS } from '@jupyterlite/contents';
import type { FSMountOptions, FSMetaData } from './webr-main';
import type { readFileSync } from 'fs';

type WorkerFileSystemType = Emscripten.FileSystemType & {
  reader: { readAsArrayBuffer: (chunk: any) => ArrayBuffer },
  FILE_MODE: number
  createNode: (dir: FS.FSNode, file: string, mode: number, dev: number,
    contents: ArrayBufferView, mtime?: Date) => FS.FSNode;
};

/**
 * Hooked FS.mount() for using WORKERFS under Node.js or with `Blob` objects
 * replaced with Uint8Array over the communication channel.
 * @internal
 */
export function mountFS(type: Emscripten.FileSystemType, opts: FSMountOptions, mountpoint: string) {
  // For non-WORKERFS filesystem types, just call the original FS.mount()
  if (type !== Module.FS.filesystems.WORKERFS) {
    return Module.FS._mount(type, opts, mountpoint) as void;
  }

  // Otherwise, handle `packages` using our own internal mountImageData()
  if ('packages' in opts && opts.packages) {
    opts.packages.forEach((pkg) => {
      mountImageData(pkg.blob as ArrayBufferLike, pkg.metadata, mountpoint);
    });
  } else {
    // TODO: Handle `blobs` and `files` keys.
    throw new Error(
      "Can't mount data. You must use the `packages` key when mounting with `WORKERFS` in webR."
    );
  }
}

/**
 * Mount a Jupyterlite DriveFS Emscripten filesystem to the VFS
 * @internal
 */
export function mountDriveFS(driveName: string, mountpoint: string): void {
  // DriveFS requires the current jupyterlite application base URL
  const baseUrl = location.origin + '/';

  const fs = new DriveFS({
    FS: (globalThis as any).FS as DriveFS.IOptions['FS'],
    PATH: (globalThis as any).PATH as DriveFS.IOptions['PATH'],
    ERRNO_CODES: (globalThis as any).ERRNO_CODES as object,
    baseUrl,
    driveName,
    mountpoint,
  });
  Module.FS.mount(fs, {}, mountpoint);
}

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
    // Main thread communication casts `Blob` to Uint8Array
    // FIXME: Use a replacer + reviver to handle `Blob`s
    Module.FS._mount(Module.FS.filesystems.WORKERFS, {
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
  const index = getArchiveMetadata(buffer) || findArchiveMetadata(buffer);
  if (!index) {
    throw new Error("Can't mount archive, no VFS metadata found.");
  }

  const bytes = new DataView(buffer, 512 * index.block, index.len);
  const metadata = JSON.parse(new TextDecoder().decode(bytes)) as FSMetaData;
  return { data: buffer, metadata };
}

// Use archive "hint" data to get metadata offset and length
function getArchiveMetadata(buffer: ArrayBufferLike) {
  const view = new DataView(buffer);
  const magic = view.getInt32(view.byteLength - 16);
  // const reserved = view.getInt32(view.byteLength - 12);
  const block = view.getInt32(view.byteLength - 8);
  const len = view.getInt32(view.byteLength - 4);

  if (magic !== 2003133010 || block === 0 || len === 0) {
    return null;
  } else {
    return { block, len };
  }
}

// Search the .tar archive for the metadata file
function findArchiveMetadata(buffer: ArrayBufferLike) {
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset < buffer.byteLength) {
    const header = buffer.slice(offset, offset + 512);
    offset += 512;

    // End of archive
    if (new Uint8Array(header).every(byte => byte === 0)) {
      return null;
    }

    // Skip directories, global, and vendor-specific extended headers
    const type = decoder.decode(header.slice(156, 157));
    if (/5|g|[A-Z]/.test(type)) {
      continue;
    }

    // Entry data
    const filename = decoder.decode(header.slice(0, 100)).replace(/\0+$/, '');
    const len = parseInt(decoder.decode(header.slice(124, 136)), 8);
    if (filename == '.vfs-index.json') {
      return { block: offset / 512, len };
    }

    // Skip to the next block
    offset += 512 * Math.ceil(len / 512.);
  }
  return null;
}
