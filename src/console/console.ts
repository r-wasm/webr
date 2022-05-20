import { loadWebR, WebRAPIInterface } from '../webR/webR';

type webROutput = {
  type: string;
  text: string;
};

(async () => {
  const webR: WebRAPIInterface = await loadWebR({
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
