import { wrap } from 'comlink';
import { WebRAPIInterface } from '../webR/webR';

(async () => {
  const worker = new Worker('./webR.js');
  const webR = wrap(worker) as WebRAPIInterface;
  await webR.loadWebR({
    RArgs: [],
  });

  for (;;) {
    const output = await webR.readOutput();
    if (output.type === 'stdout') {
      console.log(output.text);
    } else if (output.type === 'stderr') {
      console.error(output.text);
    }
  }
})();
