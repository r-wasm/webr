import { initFSTree, FSTreeInterface, JSTreeNode, FSNode } from './fstree';
import { WebR } from '../webR/main';

import $ from 'jquery';
import 'jquery.terminal/css/jquery.terminal.css';

/* eslint-disable */
// @ts-ignore
import jQueryTerminal from 'jquery.terminal';
jQueryTerminal($);
// @ts-ignore
import unixFormatting from 'jquery.terminal/js/unix_formatting.js';
unixFormatting();
/* eslint-enable */

let FSTree: FSTreeInterface;

const term = $('#term').terminal(
  (command) => {
    term.pause();
    (async () => {
      // FIXME: Can no longer call into the backend without going
      // through the input queue

      // const reg = /(library|require)\(['"]?(.*?)['"]?\)/g;
      // let res;
      // const packages = [];
      // while ((res = reg.exec(command)) !== null) {
      //   packages.push(res[2]);
      // }
      // try {
      //   await webR.loadPackages(packages);
      // } catch (e) {
      //   console.log(
      //     'An error occured loading one or more packages. Perhaps they do not exist in webR-ports?'
      //   );
      // }

      webR.putConsoleInput(command + '\n');
    })();
  },
  {
    prompt: '',
    greetings: 'R is downloading, please wait...',
    history: true,
  }
);

function onFSTreeChange(event: Event, data: { node: JSTreeNode }) {
  if (data.node && data.node.original) {
    if (!data.node.original.isFolder) {
      $('#download-file').prop('disabled', false);
      $('#upload-file').prop('disabled', true);
    } else {
      $('#download-file').prop('disabled', true);
      $('#upload-file').prop('disabled', false);
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
    webR.getFSNode('/').then((node: FSNode) => {
      const jsTreeNode = FSTree.createJSTreeNodefromFSNode(node);
      jsTreeNode.parents = [];
      jsTreeNode.state = Object.assign(jsTreeNode.state, {
        selected: true,
      });
      cb.call(FSTree, jsTreeNode);
    });
  }
}

const webR = new WebR();

(async () => {
  await webR.init({
    RArgs: [],
    REnv: {
      R_HOME: '/usr/lib/R',
      R_ENABLE_JIT: '0',
      R_DEFAULT_DEVICE: 'canvas',
      COLORTERM: 'truecolor',
    },
  });

  term.clear();

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
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    download.addEventListener('click', async () => {
      const node = FSTree.getSelectedNode();
      if (!node) return;

      const filepath = FSTree.getNodeFileName(node);
      const data = await webR.getFileData(filepath);

      const filename = node.text;
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
      link.remove();
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
            await webR.putFileData(filepath + '/' + file.name, data);
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
    const output = await webR.readOutput();
    switch (output.type) {
      case 'stdout':
        term.echo(output.text, { exec: false });
        break;
      case 'stderr':
        term.error(output.text);
        break;
      case 'prompt':
        term.set_prompt(output.text);
        FSTree.refresh();
        term.resume();
        break;
      case 'packageLoading':
        console.log(`Loading package: ${output.text}`);
        FSTree.refresh();
        break;
      case 'canvasExec':
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        Function(`document.getElementById('plot-canvas').getContext('2d').${output.text}`)();
        break;
      default:
        console.error(`Unimplemented output type: ${output.type}`);
        console.error(output.text);
    }
  }
})();
