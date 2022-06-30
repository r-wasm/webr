import {
  runRCode,
  putFileData,
  getFileData,
  loadPackages,
  isLoaded,
  init,
  WebRBackend,
  getFSNode,
} from './webR';
import { expose } from 'synclink';

const exports: WebRBackend = {
  runRCode,
  putFileData,
  getFileData,
  loadPackages,
  isLoaded,
  init,
  getFSNode,
};

expose(exports);
