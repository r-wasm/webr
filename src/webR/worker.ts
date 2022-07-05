import {
  runRCode,
  putFileData,
  getFileData,
  init,
  WebRBackendPrivate,
  getFSNode,
} from './webR';
import { expose } from 'synclink';

const exports: WebRBackendPrivate = {
  runRCode,
  putFileData,
  getFileData,
  init,
  getFSNode,
};

expose(exports);
