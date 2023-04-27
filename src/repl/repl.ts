import { initFSTree, FSTreeInterface, JSTreeNode } from './fstree';
import { WebR, FSNode } from '../webR/webr-main';

import 'xterm/css/xterm.css';
import { Terminal } from 'xterm';
import { Readline } from 'xterm-readline';
import { FitAddon } from 'xterm-addon-fit';

const term = new Terminal({
  theme: {
    background: '#191919',
    foreground: '#F0F0F0',
  },
  screenReaderMode: true,
});
const fitAddon = new FitAddon();
const readline = new Readline();

term.write('webR is downloading, please wait...');
term.loadAddon(fitAddon);
term.loadAddon(readline);
term.open(document.getElementById('term') as HTMLElement);
term.focus();
fitAddon.fit();

function resizeTerm() {
  (async () => {
    await webR.init();
    const dims = fitAddon.proposeDimensions();
    await webR.evalRVoid(`options(width=${dims ? dims.cols : 80})`);
  })();
  fitAddon.fit();
}
window.addEventListener('resize', resizeTerm);

let FSTree: FSTreeInterface;

function onFSTreeChange(event: Event, data: { node: JSTreeNode }) {
  if (data.node && data.node.original) {
    if (!data.node.original.isFolder) {
      document.getElementById('download-file')?.removeAttribute('disabled');
      document.getElementById('upload-file')?.setAttribute('disabled', '');
    } else {
      document.getElementById('download-file')?.setAttribute('disabled', '');
      document.getElementById('upload-file')?.removeAttribute('disabled');
    }
  }
}

function FSTreeData(
  obj: { id: string },
  cb: {
    call: (FSTree: FSTreeInterface, jsTreeNode: JSTreeNode) => void;
  }
) {
  if (obj.id === '#') {
    webR.FS.lookupPath('/').then((node: FSNode) => {
      const jsTreeNode = FSTree.createJSTreeNodefromFSNode(node);
      jsTreeNode.parents = [];
      cb.call(FSTree, jsTreeNode);
    });
  }
}

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

(async () => {
  await webR.init();

  readline.setCtrlCHandler(() => webR.interrupt());

  await webR.evalRVoid('webr::global_prompt_install()', { withHandlers: false });
  await webR.evalRVoid('options(device=webr::canvas)');

  // Clear the loading message
  term.write('\x1b[2K\r');
  resizeTerm();

  FSTree = initFSTree({
    selector: '#jstree_fs',
    core: {
      check_callback: true,
      data: FSTreeData,
      multiple: false,
    },
  });

  FSTree.getJSTreeElement().on('changed.jstree', onFSTreeChange);

  const download = document.getElementById('download-file');
  if (download)
    download.addEventListener('click', () => {
      const node = FSTree.getSelectedNode();
      if (!node) return;

      const filepath = FSTree.getNodeFileName(node);
      webR.FS.readFile(filepath).then((data) => {
        const filename = node.text;
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        link.remove();
      });
    });

  const upload = document.getElementById('input-upload') as HTMLInputElement;
  if (upload)
    upload.addEventListener(
      'change',
      () => {
        const node = FSTree.getSelectedNode();
        if (node) {
          let filepath = FSTree.getNodeFileName(node);

          if (filepath === '') {
            filepath = '/';
          }
          if (!upload.files || upload.files.length === 0) {
            return;
          }

          const file = upload.files[0];
          const fr = new FileReader();

          fr.onload = async function () {
            upload.value = '';
            const data = new Uint8Array(fr.result as ArrayBuffer);
            await webR.FS.writeFile(filepath + '/' + file.name, data);
            FSTree.refresh();
          };

          fr.readAsArrayBuffer(file as Blob);
        }
      },
      false
    );

  const plotsave = document.getElementById('plot-save');
  if (plotsave)
    plotsave.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = 'plot.png';
      const plotCanvas = document.getElementById('plot-canvas') as HTMLCanvasElement;
      if (!plotCanvas) return;
      link.href = plotCanvas.toDataURL();
      link.click();
      link.remove();
    });

  for (;;) {
    const output = await webR.read();

    switch (output.type) {
      case 'stdout':
        readline.println(output.data as string);
        break;
      case 'stderr':
        readline.println(`\x1b[1;31m${output.data as string}\x1b[m`);
        break;
      case 'prompt':
        readline.read(output.data as string).then((command) => webR.writeConsole(command));
        FSTree.refresh();
        break;
      case 'packageLoading':
        console.log(`Loading package: ${output.data as string}`);
        FSTree.refresh();
        break;
      case 'canvasExec':
        Function(`
           document.getElementById('plot-canvas').getContext('2d').${output.data as string}
         `)();
        break;
      case 'closed':
        throw new Error('The webR communication channel has been closed');
      default:
        console.error(`Unimplemented output type: ${output.type}`);
        console.error(output.data);
    }
  }
})();
