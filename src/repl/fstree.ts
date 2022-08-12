import { FSNode } from '../webR/webr-main';

import $ from 'jquery';
import 'jstree/dist/themes/default/style.css';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import jsTree from 'jstree/dist/jstree.js';
jsTree;

interface JQueryJSTreeElement extends Omit<JQuery, 'on'> {
  jstree(options?: {}): JSTree;
  on(
    eventName: string,
    callback: (
      event: Event,
      data: {
        node: JSTreeNode;
        action: any;
        selected: string[];
        event: Event;
      }
    ) => void
  ): this;
}

export type JSTreeNode = {
  text: string;
  icon?: string;
  state?: {
    opened?: boolean;
    disabled?: boolean;
    selected?: boolean;
  };
  parents?: JSTreeNode[];
  children?: JSTreeNode[];
  original?: { [key: string]: any };
  isFolder?: boolean;
};

type FSTreeOptions = {
  selector: string;
  core?: {
    check_callback: boolean;
    data: (
      obj: { id: string },
      cb: { call: (FSTree: FSTreeInterface, jsTreeNode: JSTreeNode) => any }
    ) => void;
    multiple: boolean;
  };
};

let _jstree: JSTree;
let _config: FSTreeOptions;

export interface FSTreeInterface {
  getSelectedNodes: typeof getSelectedNodes;
  getSelectedNode: typeof getSelectedNode;
  refresh: typeof refresh;
  createJSTreeNodefromFSNode: typeof createJSTreeNodefromFSNode;
  getJSTreeElement: typeof getJSTreeElement;
  getNodeFileName: typeof getNodeFileName;
}

export function initFSTree(options: FSTreeOptions): FSTreeInterface {
  const defaultConfig = {
    core: {
      multiple: false,
      check_callback: false,
    },
    onChange: () => {},
  };
  _config = Object.assign(defaultConfig, options);

  // Initialise jstree instance
  $(_config.selector).jstree(_config);

  // Get the new instance
  _jstree = $(_config.selector).jstree();

  const namespace: FSTreeInterface = {
    getSelectedNodes,
    getSelectedNode,
    refresh,
    createJSTreeNodefromFSNode,
    getJSTreeElement,
    getNodeFileName,
  };
  return namespace;
}

export function getJSTreeElement(): JQueryJSTreeElement {
  return $(_config.selector) as unknown as JQueryJSTreeElement;
}

export function getSelectedNodes(): JSTreeNode[] {
  return _jstree.get_selected(true) as JSTreeNode[];
}

export function getSelectedNode(): JSTreeNode | undefined {
  const nodes = _jstree.get_selected(true) as JSTreeNode[];
  if (nodes.length > 0) {
    return nodes[0];
  }
  return undefined;
}

export function getNodeFileName(node: JSTreeNode): string {
  if (node.parents) {
    const parentText = node.parents
      .map((nid) => (_jstree.get_node(nid) as JSTreeNode).text)
      .reverse()
      .slice(1);
    parentText.push(node.text);
    parentText[0] = '';
    return parentText.join('/');
  }
  return '/';
}

export function refresh(): void {
  return _jstree.refresh();
}

export function createJSTreeNodefromFSNode(fsNode: FSNode): JSTreeNode {
  const jsTreeNode: JSTreeNode = {
    text: fsNode.name,
    isFolder: fsNode.isFolder,
  };
  if (fsNode.isFolder) {
    jsTreeNode.children = Object.entries(fsNode.contents).map(([, node]) =>
      createJSTreeNodefromFSNode(node)
    );
    if (fsNode.name === '/') {
      jsTreeNode.state = {
        opened: true,
      };
    }
    return jsTreeNode;
  }
  jsTreeNode.icon = 'jstree-file';
  return jsTreeNode;
}
