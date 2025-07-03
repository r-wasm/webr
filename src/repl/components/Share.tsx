
import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { inflate, deflate } from "pako";
import { decode, encode } from '@msgpack/msgpack';
import { base64ToBuffer, bufferToBase64 } from '../../webR/utils';
import { FilesInterface } from "../App";
import { WebR } from "../../webR/webr-main";
import { EditorFile, EditorItem } from "./Editor";
import './Share.css';

export interface ShareItem {
  name: string;
  path: string;
  data: Uint8Array;
}

export function isShareItems(files: any): files is ShareItem[] {
  return Array.isArray(files) && files.every((file) =>
    'name' in file &&
    typeof file.name === 'string' &&
    'path' in file &&
    typeof file.path === 'string' &&
    'data' in file &&
    file.data instanceof Uint8Array
  );
}

export async function applyShareData(webR: WebR, filesInterface: FilesInterface, items: ShareItem[], replace: boolean): Promise<void> {
  await webR.init();
  await Promise.all(items.map(async ({ path, data }) => await webR.FS.writeFile(path, data)));
  void filesInterface.refreshFilesystem();
  void filesInterface.openFilesInEditor(items.map((item) => ({ name: item.name, path: item.path, forceRead: true })), replace);
}

export function applyShareString(webR: WebR, filesInterface: FilesInterface, data: string): Promise<void> {
  const buffer = base64ToBuffer(decodeURIComponent(data));
  const items = decode(inflate(buffer));
  if (!isShareItems(items)) {
    throw new Error("Provided URL data is not a valid set of share files.");
  }
  return applyShareData(webR, filesInterface, items, false);
}

export async function editorToShareData(webR: WebR, files: EditorItem[]): Promise<string> {
  const shareFiles: ShareItem[] = await Promise.all(
    files.filter((file): file is EditorFile => file.type === "text" && !file.readOnly)
      .map(async (file) => ({
        name: file.name,
        path: file.path,
        data: await webR.FS.readFile(file.path)
      }))
  );

  const compressed = deflate(encode(shareFiles));
  return encodeURIComponent(bufferToBase64(compressed));
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
