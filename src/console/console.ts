import { wrap } from 'synclink';
import { WebRBackend } from '../webR/webR';

(async () => {
  const worker = new Worker('./webR.js');
  const webR = wrap(worker) as WebRBackend;
  await webR.init({
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
