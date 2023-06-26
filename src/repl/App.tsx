import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import Terminal from './components/Terminal';
import Plot from './components/Plot';
import Files from './components/Files';
import { Readline } from 'xterm-readline';
import { WebR } from '../webR/webr-main';
import { CanvasMessage } from '../webR/webr-chan';
import "./App.css";

const webR = new WebR({
  RArgs: [],
  REnv: {
    R_HOME: '/usr/lib/R',
    FONTCONFIG_PATH: '/etc/fonts',
    R_ENABLE_JIT: '0',
    COLORTERM: 'truecolor',
  },
});
(globalThis as any).webR = webR;

export interface TerminalInterface {
  println: Readline["println"];
  read: Readline["read"];
  write: Readline["write"];
}

export interface FilesInterface {
  refreshFilesystem: () => void;
}

const terminalInterface: TerminalInterface = {
  println: (msg: string) => { console.log(msg) },
  read: () => Promise.reject(new Error('Unable to read from webR terminal.')),
  write: (msg: string) => { console.log(msg) },
}

const filesInterface: FilesInterface = {
  refreshFilesystem: () => {},
}

function App() {
  return (
    <div className='repl'>
      <Terminal webR={webR} terminalInterface={terminalInterface}/>
      <Files webR={webR} filesInterface={filesInterface}/>
      <Plot/>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<StrictMode><App /></StrictMode>);

(async () => {
  await webR.init();
  await webR.evalRVoid('webr::global_prompt_install()', { withHandlers: false });
  await webR.evalRVoid('options(device=webr::canvas)');

  terminalInterface.write('\x1b[2K\r'); // Clear the loading message

  for (;;) {
    const output = await webR.read();
    switch (output.type) {
      case 'stdout':
        terminalInterface.println(output.data as string);
        break;
      case 'stderr':
        terminalInterface.println(`\x1b[1;31m${output.data as string}\x1b[m`);
        break;
      case 'prompt':
        filesInterface.refreshFilesystem();
        terminalInterface.read(output.data as string).then((command) => {
          webR.writeConsole(command);
        })
        break;
      case 'canvas': {
        const canvas = document.getElementById('plot-canvas') as HTMLCanvasElement;
        const context = canvas.getContext('2d');
        const msgData = output.data as CanvasMessage['data'];
        if (msgData.event === 'canvasImage') {
          context!.drawImage(msgData.image, 0, 0);
        } else if (msgData.event === 'canvasNewPage') {
          context!.clearRect(0, 0, canvas.width, canvas.height);
        }
        break;
      }
      case 'closed':
        throw new Error('The webR communication channel has been closed');
      default:
        console.error(`Unimplemented output type: ${output.type}`);
        console.error(output.data);
    }
  }
})();
