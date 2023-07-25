import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
const webR = new WebR();


// Remove the loading message once webR is ready
await webR.init();
document.getElementById('loading').remove();

// Execute R plotting code
await webR.evalRVoid(`
  webr::canvas()
  plot(rnorm(1000), rnorm(1000), xlab="x axis label", ylab="y axis label", main="An rnorm plot")
  dev.off()
`);

// Flush the output queue and handle the output messages from webR
const msgs = await webR.flush();
msgs.forEach(msg => {
    if (msg.type === 'canvas' && msg.data.event === 'canvasImage') {
      const canvas = document.getElementById('plot-canvas');
      canvas.getContext('2d').drawImage(msg.data.image, 0, 0);
    } else {
      console.log(msg);
    }
});
