import $ from 'jquery';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
require('jstree');

interface JQueryJSTreeElement extends Omit<JQuery, 'on'> {
  jstree(options?: {}): JQueryJSTree;
  on(
    eventName: string,
    callback: (
      event: Event,
      data: {
        node: JSTreeNode;
        action: any;
        selected: JSTreeNode[];
        event: Event;
      }
    ) => void
  ): this;
}

interface JQueryJSTree extends JQuery {
  get_selected: (full: boolean) => JSTreeNode[];
  get_node: (obj: string | HTMLElement | JSTreeNode) => JSTreeNode;
  refresh: () => void;
}

export type FSNode = {
  parent: FSNode;
  id: number;
  name: string;
  mode: number;
  isFolder: boolean;
  contents: { [key: string]: FSNode };
};

export type JSTreeNode = {
  text: string;
  icon?: string;
  state?: {
    opened?: boolean;
    disabled?: boolean;
    selected?: boolean;
  };
  parents?: JSTreeNode[];
  children: JSTreeNode[];
};

type FSTreeOptions = {
  selector: string;
  core?: {
    check_callback: boolean;
    data: (
      obj: { id: string },
      cb: { call: (FSTree: FSTreeInterface, jsTreeNode: JSTreeNode) => void }
    ) => void;
    multiple: boolean;
  };
};

let _jstree: JQueryJSTree;
let _config: FSTreeOptions;

export interface FSTreeInterface {
  getSelectedNodes: typeof getSelectedNodes;
  getSelectedNode: typeof getSelectedNode;
  refresh: typeof refresh;
  createJSTreeNodefromFSNode: typeof createJSTreeNodefromFSNode;
  getJSTreeElement: typeof getJSTreeElement;
  getNodeFileName: typeof getNodeFileName;
  _jstree: JQueryJSTree;
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
  ($(_config.selector) as unknown as JQueryJSTreeElement).jstree(_config);

  // Get the new instance
  _jstree = ($(_config.selector) as unknown as JQueryJSTreeElement).jstree();

  const namespace: FSTreeInterface = {
    getSelectedNodes,
    getSelectedNode,
    refresh,
    createJSTreeNodefromFSNode,
    getJSTreeElement,
    getNodeFileName,
    _jstree,
  };
  return namespace;
}

export function getJSTreeElement(): JQueryJSTreeElement {
  return $(_config.selector) as unknown as JQueryJSTreeElement;
}

export function getSelectedNodes(): JSTreeNode[] {
  return _jstree.get_selected(true);
}

export function getSelectedNode(): JSTreeNode | undefined {
  const nodes: JSTreeNode[] = _jstree.get_selected(true);
  if (nodes.length > 0) {
    return nodes[0];
  }
  return undefined;
}

export function getNodeFileName(node: JSTreeNode): string {
  if (node.parents) {
    const parentText = node.parents
      .map((nid) => _jstree.get_node(nid).text)
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
    children: [],
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
