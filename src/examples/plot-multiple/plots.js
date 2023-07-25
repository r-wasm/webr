import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
const webR = new WebR();
let canvas = null;
let loading = document.getElementById('loading');
let container = document.getElementById('plot-container');
let button = document.getElementById('plot-button');

button.onclick = () => {
  container.replaceChildren();
  webR.evalRVoid(`
    webr::canvas()
    demo(graphics)
    demo(persp)
    dev.off()
  `);
};

(async () => {
  // Remove the loading message once webR is ready
  await webR.init();
  loading.remove();
  button.removeAttribute('disabled');

  // Handle webR output messages in an async loop
  for (;;) {
    const output = await webR.read();
    switch (output.type) {
      case 'canvas':
        if (output.data.event === 'canvasImage') {
          // Add plot image data to the current canvas element
          canvas.getContext('2d').drawImage(output.data.image, 0, 0);
        } else if (output.data.event === 'canvasNewPage') {
          // Create a new canvas element
          canvas = document.createElement('canvas');
          canvas.setAttribute('width', '1008');
          canvas.setAttribute('height', '1008');
          canvas.style.width = "450px";
          canvas.style.height = "450px";
          canvas.style.display = "inline-block";
          container.appendChild(canvas);
        }
        break;
      default:
        console.log(output);
    }
  }
})();
