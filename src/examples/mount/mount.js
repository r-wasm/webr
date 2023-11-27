import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
const webR = new WebR();

// Remove the loading message once webR is ready
await webR.init();
document.getElementById('loading').remove();

// Download a filesystem image
await webR.FS.mkdir('/data')
const data = await fetch('./output.data');
const metadata = await fetch('./output.js.metadata');

// Mount the filesystem image data
const options = {
  packages: [{
    blob: await data.blob(),
    metadata: await metadata.json(),
  }],
}
await webR.FS.mount("WORKERFS", options, '/data');

// Read the contents of a file from the filesystem image
const result = await webR.evalR('readLines("/data/abc.txt")');
try {
  let output = await result.toArray();
  let text = output.join('\n');
  document.getElementById('out').innerText += `Contents of the filesystem image file at /data/abc.txt:\n${text}\n\n`;
} finally {
  webR.destroy(result);
}
