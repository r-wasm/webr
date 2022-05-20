import { WebR } from '../webR/webR';
import { initFSTree, FSTreeInterface, JSTreeNode, FSNode } from './fstree';

import $ from 'jquery';
import 'jquery.terminal/css/jquery.terminal.css';
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
require('jquery.terminal')($);

type webROutput = {
  type: string;
  text: string;
};

let FSTree: FSTreeInterface;

const term = $('#term').terminal(
  (command) => {
    term.pause();
    (async () => {
      const reg = /(library|require)\(['"]?(.*?)['"]?\)/g;
      let res;
      const packages = [];
      while ((res = reg.exec(command)) !== null) {
        packages.push(res[2]);
      }
      try {
        await webR.loadPackages(packages);
      } catch (e) {
        console.log(
          'An error occured loading one or more packages. Perhaps they do not exist in webR-ports?'
        );
      }
      await webR.readInput(command);
    })();
  },
  {
    prompt: '',
    greetings: 'R is downloading, please wait...',
    history: true,
  }
);

function onFSTreeChange(event: Event, data: { selected: JSTreeNode[] }) {
  if (data.selected.length > 0) {
    const node = FSTree._jstree.get_node(data.selected[0]);
    if (node.children.length === 0) {
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
  if (!FSTree) return;
  if (obj.id === '#') {
    const jsTreeNode = FSTree.createJSTreeNodefromFSNode(FS.lookupPath('/', {}).node as FSNode);
    jsTreeNode.parents = [];
    jsTreeNode.state = Object.assign(jsTreeNode.state, {
      selected: true,
    });
    cb.call(FSTree, jsTreeNode);
  }
}

const webR = new WebR();
(async () => {
  await webR.init({
    RArgs: [],
    REnv: {
      R_NSIZE: '3000000',
      R_VSIZE: '64M',
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
    const output = (await webR.readOutput()) as webROutput;
    if (output.type === 'stdout') {
      term.echo(output.text, { exec: false });
    } else if (output.type === 'prompt') {
      term.set_prompt(output.text);
      term.resume();
    } else {
      term.error(output.text);
    }
    FSTree.refresh();
  }
})();
