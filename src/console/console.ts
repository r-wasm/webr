import { WebR } from '../webR/webr-main';

(async () => {
  const webR = new WebR();

  for (;;) {
    const output = await webR.read();
    if (output.type === 'stdout') {
      console.log(output.data);
    } else if (output.type === 'stderr') {
      console.error(output.data);
    }
  }
})();
