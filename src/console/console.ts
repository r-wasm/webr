import { WebR } from '../webR/webR';

type webROutput = {
  type: string;
  text: string;
};

const webR = new WebR();

(async () => {
  (globalThis as any).webR = await webR.init({
    RArgs: [],
  });

  for (;;) {
    const output = (await webR.readOutput()) as webROutput;
    if (output.type === 'stdout') {
      console.log(output.text);
    } else if (output.type === 'stderr') {
      console.error(output.text);
    }
  }
})();
