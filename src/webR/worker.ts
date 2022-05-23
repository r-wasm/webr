import {
  runRAsync,
  readInput,
  readOutput,
  putFileData,
  getFileData,
  loadPackages,
  isLoaded,
  loadWebR,
  WebRAPIInterface,
  getFSNode,
} from './webR';
import { expose } from 'comlink';

const exports: WebRAPIInterface = {
  runRAsync,
  readInput,
  readOutput,
  putFileData,
  getFileData,
  loadPackages,
  isLoaded,
  loadWebR,
  getFSNode,
};

expose(exports);
