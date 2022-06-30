import {
  runRCode,
  readOutput,
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
  readOutput,
  putFileData,
  getFileData,
  loadPackages,
  isLoaded,
  init,
  getFSNode,
};

expose(exports);
