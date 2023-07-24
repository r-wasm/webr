/* Create a webR console using the Console helper class */
import { Console } from 'https://webr.r-wasm.org/latest/webr.mjs';

const webRConsole = new Console({
  stdout: line => document.getElementById('out').append(line + '\n'),
  stderr: line => document.getElementById('out').append(line + '\n'),
  prompt: p => document.getElementById('out').append(p),
});
webRConsole.run();

/* Write to the webR console using the ``stdin()`` method */
const input = document.getElementById('input');
globalThis.sendInput = () => {
  webRConsole.stdin(input.value);
  document.getElementById('out').append(input.value + '\n');
  input.value = '';
};

/* Send input on Enter key */
input.addEventListener('keydown', (evt) => {
  if(evt.key === 'Enter') globalThis.sendInput();
});
