
import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { inflate, deflate } from "pako";
import { decode, encode } from '@msgpack/msgpack';
import { base64ToBuffer, bufferToBase64 } from '../../webR/utils';
import './Share.css';

export type ShareItem = {
  name: string;
  path: string;
  data?: Uint8Array;
  text?: string;
  autorun?: boolean;
};

export enum ShareDataFlags {
  UNCOMPRESSED = 'u',
  ZLIB = 'z',
  MSGPACK = 'm',
  JSON = 'j',
  AUTORUN = 'a',
}

export function isShareItems(files: any): files is ShareItem[] {
  return Array.isArray(files) && files.every((file) =>
    'name' in file && typeof file.name === 'string' &&
    'path' in file && typeof file.path === 'string' &&
    (
      ('text' in file && typeof file.text === "string") ||
      ('data' in file && file.data instanceof Uint8Array)
    )
  );
}

/**
 * Encode files for sharing.
 *
 * Encode shared files for use as the hash string in a sharing URL.
 * This function outputs strings with msgpack format and zlib compression.
 *
 * Shared item typing
 * ------------------
 * A shared item is an object with the following format,
 *
 *   { name: string; path: string; text?: string; data?: Uint8Array }
 *
 * where `name` is a display name (usually the filename), `path` is the path
 * where the file will be written to the Emscripten VFS, and either a `text`
 * string or the file's binary `data` is present, defining the content for the
 * shared file.
 *
 * Sharing via Data URI
 * --------------------
 * An array of shared items should be encoded either in msgpack or JSON format,
 * and then optionally compressed using the zlib deflate algorithm.
 *
 * The resulting binary data should be base64 encoded, with special characters
 * encoded for use as a URL hash.
 *
 * The hash may optionally end in `&[...]`, where [...] may be one or more of
 * the following flags:
 *  - 'u': uncompressed
 *  - 'z': zlib compressed
 *  - 'm': msgpack format
 *  - 'j': json format
 *  - 'a': autorun R scripts
 * The default flags string is `&mz`.
 *
 * Sharing via `postMessage()`
 * ---------------------------
 * The webR app listens for messages with `data` containing an array of shared
 * items: { items: ShareItem[] }.
 *
 * When such a message has been received, the shared file content is applied
 * to the current editor.
 * @param {ShareItem[]} items An array of shared file content.
 * @returns {string} Encoded URI string.
 */
export function encodeShareData(items: ShareItem[]): string {
  const encoded = encode(items); // msgpack format
  const compressed = deflate(encoded); // zlib deflate compressed
  const base64 = bufferToBase64(compressed); // base64 encoded
  const uri = encodeURIComponent(base64); // Encode special characters for URI
  return uri;
}

/**
 * Decode shared files data.
 *
 * Decodes the hash string provided in a sharing URL. Data may be JSON or
 * msgpack encoded, with optional compression. See `encodeShareData()` for
 * futher details.
 * @param {string} data Encoded URI string.
 * @param {string} [flags] Decoding flags. Defaults to `mz`, meaning msgpack
 *   format and zlib compressed.
 * @returns {ShareItem[]} An array of shared file content.
 */
export function decodeShareData(data: string, flags = 'mz'): ShareItem[] {
  const base64 = decodeURIComponent(data); // Decode URI encoded characters
  const buffer = base64ToBuffer(base64); // Decode base64

  const encoded = flags.includes(ShareDataFlags.UNCOMPRESSED)
    ? buffer // No compression
    : inflate(buffer); // zlib deflate compressed

  const items = flags.includes(ShareDataFlags.JSON)
    ? JSON.parse(new TextDecoder().decode(encoded)) as unknown // JSON format
    : decode(encoded); // msgpack format

  if (!isShareItems(items)) {
    throw new Error("Provided URL data is not a valid set of share files.");
  }

  let shareItems = items;
  if (flags.includes(ShareDataFlags.AUTORUN)) {
    shareItems = items.map((item) => item.name.toLowerCase().endsWith('.r') ? { ...item, autorun: true } : item);
  }

  return shareItems;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

export function ShareModal({ isOpen, onClose, shareUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const urlBytes = new TextEncoder().encode(shareUrl).length;

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay">
      <div className="share-modal">
        <button className="share-modal-close" onClick={onClose} aria-label="Close">
          <FaTimes aria-hidden="true" />
        </button>
        <div className="share-modal-heading">Share URL ({urlBytes} bytes)</div>
        <div className="share-modal-content">
          <input
            id="share-url"
            type="text"
            readOnly
            value={shareUrl}
            aria-label="Share URL"
          />
          <button
            className="copy-button"
            onClick={handleCopyClick}
            aria-label="Copy URL to clipboard"
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
