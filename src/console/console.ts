import { WebR } from '../webR/webR';

type webROutput = {
  type: string;
  text: string;
};

type WebRReadInputFunction = () => Promise<string>;

class WebRFrontend {
  readInput: WebRReadInputFunction = async () => {
    return await new Promise(() => {});
  };
}
(globalThis as any).webRFrontend = new WebRFrontend();

const webR = new WebR();

(async () => {
  (globalThis as any).webR = await webR.init({
    RArgs: [],
  });

  for (;;) {
    const output = (await webR.readOutput()) as webROutput;
    if (output.type === 'stdout') {
      console.log(output.text);
    } else {
      console.error(output.text);
    }
  }
})();
