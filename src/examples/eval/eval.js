import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
const webR = new WebR();

// Remove the loading message once webR is ready
await webR.init();
document.getElementById('loading').remove();

// Evaluate some R code using evalR
let result = await webR.evalR('rnorm(10,5,1)');

// Display the results
try {
  let output = await result.toArray();
  let text = output.join('\n');
  document.getElementById('out').innerText += `Result of evaluating with evalR():\n${text}\n\n`;
} finally {
  webR.destroy(result);
}

// Capture some R output using a Shelter and captureR
let shelter = await new webR.Shelter();
try {
  let capture = await shelter.captureR('print(rnorm(100,5,1))');

  // Display the results
  let text = capture.output.map((val) => val.data).join('\n');
  document.getElementById('out').innerText += `Result of capturing with captureR():\n${text}\n\n`;
} finally {
  shelter.purge();
}
