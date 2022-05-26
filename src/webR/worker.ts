import {
  runRCode,
  readInput,
  readOutput,
  putFileData,
  getFileData,
  loadPackages,
  isLoaded,
  init,
  WebRBackend,
  getFSNode,
} from './webR';
import { expose } from 'comlink';

const exports: WebRBackend = {
  runRCode,
  readInput,
  readOutput,
  putFileData,
  getFileData,
  loadPackages,
  isLoaded,
  init,
  getFSNode,
};

expose(exports);
