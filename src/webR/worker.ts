import {
  runRCode,
  init,
  WebRBackendPrivate,
} from './webR';
import { expose } from 'synclink';

const exports: WebRBackendPrivate = {
  runRCode,
  init,
};

expose(exports);
