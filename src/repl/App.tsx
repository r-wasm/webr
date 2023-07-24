import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import Terminal from './components/Terminal';
import Editor from './components/Editor';
import Plot from './components/Plot';
import Files from './components/Files';
import { Readline } from 'xterm-readline';
import { WebR } from '../webR/webr-main';
import { CanvasMessage, PagerMessage } from '../webR/webr-chan';
import './App.css';

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
  println: Readline['println'];
  read: Readline['read'];
  write: Readline['write'];
}

export interface FilesInterface {
  refreshFilesystem: () => Promise<void>;
  openFileInEditor: (name: string, path: string, readOnly: boolean) => Promise<void>;
}

export interface PlotInterface {
  newPlot: () => void;
  drawImage: (img: ImageBitmap) => void;
}

const terminalInterface: TerminalInterface = {
  println: (msg: string) => { console.log(msg); },
  read: () => Promise.reject(new Error('Unable to read from webR terminal.')),
  write: (msg: string) => { console.log(msg); },
};

const filesInterface: FilesInterface = {
  refreshFilesystem: () => Promise.resolve(),
  openFileInEditor: () => { throw new Error('Unable to open file, editor not initialised.'); },
};

const plotInterface: PlotInterface = {
  newPlot: () => {},
  drawImage: (img: ImageBitmap) => {
    throw new Error('Unable to plot, plotting not initialised.');
  },
};

async function handleCanvasMessage(msg: CanvasMessage) {
  if (msg.data.event === 'canvasImage') {
    plotInterface.drawImage(msg.data.image);
  } else if (msg.data.event === 'canvasNewPage') {
    plotInterface.newPlot();
  }
}

async function handlePagerMessage(msg: PagerMessage){
    const { path, title, deleteFile } = msg.data;
    await filesInterface.openFileInEditor(title, path, true);
    if (deleteFile) {
      webR.FS.unlink(path);
    }
}

function App() {
  return (
    <div className='repl'>
      <Editor
        webR={webR}
        terminalInterface={terminalInterface}
        filesInterface={filesInterface}
      />
      <Terminal webR={webR} terminalInterface={terminalInterface}/>
      <Files webR={webR} filesInterface={filesInterface}/>
      <Plot plotInterface={plotInterface}/>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<StrictMode><App /></StrictMode>);

(async () => {
  await webR.init();

  // Set the default graphics device, pager, and missing package handler
  await webR.evalRVoid('webr::pager_install()');
  await webR.evalRVoid('webr::canvas_install()');
  await webR.evalRVoid('webr::global_prompt_install()', { withHandlers: false });

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
        });
        break;
      case 'canvas':
        await handleCanvasMessage(output as CanvasMessage);
        break;
      case 'pager':
        await handlePagerMessage(output as PagerMessage);
        break;
      case 'closed':
        throw new Error('The webR communication channel has been closed');
      default:
        console.error(`Unimplemented output type: ${output.type}`);
        console.error(output.data);
    }
  }
})();
