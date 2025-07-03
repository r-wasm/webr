import { inflate, deflate } from "pako";
import { decode, encode } from '@msgpack/msgpack';
import { base64ToBuffer, bufferToBase64 } from '../../webR/utils';
import { FilesInterface } from "../App";
import { WebR } from "../../webR/webr-main";
import { EditorFile, EditorItem } from "./Editor";

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
  )
}

export const applyShareData = async (webR: WebR, filesInterface: FilesInterface, data: string): Promise<void> => {
  const buffer = base64ToBuffer(data);
  const items = decode(inflate(buffer));
  if (!isShareItems(items)) {
    throw new Error("Provided URL data is not a valid set of share files.");
  }

  await webR.init();
  await Promise.all(items.map(async ({ path, data }) => await webR.FS.writeFile(path, data)));
  void filesInterface.refreshFilesystem();
  items.forEach((item) => filesInterface.openFileInEditor(item.name, item.path, { forceRead: true }));
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
  return bufferToBase64(compressed);
};
