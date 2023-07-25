import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
const webR = new WebR();
await webR.init();

// Create a PDF file containing a plot
await webR.evalRVoid(`
  pdf()
  hist(rnorm(10000))
  dev.off()
`);

// Obtain the contents of the file from the VFS
const plotData = await webR.FS.readFile('/home/web_user/Rplots.pdf');

// Create a link for the user to download the file contents
const blob = new Blob([plotData], { type: 'application/octet-stream' });
const link = document.createElement('a');
link.download = 'Rplots.pdf';
link.href = URL.createObjectURL(blob);
link.textContent = 'Click to download PDF';
document.getElementById('link-container').appendChild(link);

// Everything is ready, remove the loading message
document.getElementById('loading').remove();
