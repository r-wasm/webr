import { loadWebR, WebRAPIInterface } from '../webR/webR';

(async () => {
  const webR: WebRAPIInterface = await loadWebR({
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
