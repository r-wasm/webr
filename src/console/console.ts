import { WebR } from '../webR/webR';

class WebRFrontend {
  readInput = async () => undefined;
}
globalThis.webRFrontend = new WebRFrontend();

const webR = new WebR();

(async () => {
  globalThis.webR = await webR.init({
    RArgs: [],
  });

  for (;;) {
    const output = await webR.readOutput();
    if (output.type === 'stdout') {
      console.log(output.text);
    } else {
      console.error(output.text);
    }
  }
})();
