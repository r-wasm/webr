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
} from '../webR/webR';

(globalThis as any).webR = {
  runRCode,
  readInput,
  readOutput,
  putFileData,
  getFileData,
  loadPackages,
  isLoaded,
  init,
  getFSNode,
} as WebRBackend;

(async () => {
  await init({
    RArgs: [],
  });

  for (;;) {
    const output = await readOutput();
    if (output.type === 'stdout') {
      console.log(output.text);
    } else if (output.type === 'stderr') {
      console.error(output.text);
    }
  }
})();
