import React, { ChangeEventHandler } from 'react';
import * as Fa from 'react-icons/fa';
import TreeView, { flattenTree, INode, ITreeViewProps } from 'react-accessible-treeview';
import { WebR, WebRError } from '../../webR/webr-main';
import type { FSNode } from '../../webR/webr-main';
import { FilesInterface } from '../App';
import './Files.css';

const FolderIcon = ({ isOpen }: { isOpen: boolean }) => isOpen
  ? <Fa.FaFolderOpen className="icon icon-folder" />
  : <Fa.FaFolder className="icon icon-folder" />;

interface ITreeNode {
  id: number
  name: string;
  children?: ITreeNode[];
  metadata?: { [x: string]: string | number | null | undefined };
}

/* Convert a VFS node from Emscripten's FS API into a `ITreeNode`, so that it
 * can be displayed by react-accessible-treeview.
 */
export function createTreeFromFSNode(fsNode: FSNode): ITreeNode {
  const tree: ITreeNode = {
    id: fsNode.id,
    name: fsNode.name,
    metadata: { type: fsNode.isFolder ? 'folder' : 'file' },
  };
  if (fsNode.isFolder && fsNode.contents) {
    tree.children = Object.entries(fsNode.contents).map(([name, node]) => {
      const child = (node.mounted === null) ? node : node.mounted.root;
      child.name = name;
      return createTreeFromFSNode(child);
    }
    ).sort((a, b) => a.name.localeCompare(b.name));
  }
  return tree;
}

const initialData = flattenTree({ name: '', children: [] });

export function Files({
  webR,
  filesInterface,
}: {
  webR: WebR;
  filesInterface: FilesInterface;
}) {
  const [treeData, setTreeData] = React.useState<INode[]>(initialData);
  const [selectedNode, setSelectedNode] = React.useState<INode | null>();
  const [isFileSelected, setIsFileSelected] = React.useState<boolean>(true);
  const [selectedIds, setSelectedIds] = React.useState<number[]>([1]);
  const uploadRef = React.useRef<HTMLInputElement | null>(null);
  const uploadButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const downloadButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const nodeRenderer: ITreeViewProps['nodeRenderer'] = ({
    element,
    isExpanded,
    getNodeProps,
    level,
  }) => (
    <div {...getNodeProps()} style={{ paddingLeft: 2 + 20 * (level - 1) }}>
      {
        element.metadata!.type === 'folder'
          ? <FolderIcon isOpen={isExpanded} />
          : <Fa.FaRegFile className="icon" />
      }
      {element.name}
    </div>
  );

  const getNodePath = (node?: INode): string => {
    if (!node || !node.parent) return '';
    const prefix = node.parent
      ? getNodePath(treeData.find((value) => value.id === node.parent))
      : '';
    return `${prefix}/${node.name}`;
  };

  const onNodeSelect: ITreeViewProps['onNodeSelect'] = ({ element }) => {
    setSelectedNode(element);
    setIsFileSelected(element.metadata!.type === 'file');
  };

  const onExpand: ITreeViewProps['onExpand'] = ({ element }) => {
    setSelectedNode(element);
    setIsFileSelected(element.metadata!.type === 'file');
    setSelectedIds([Number(element.id)]);
  };

  const onUpload: ChangeEventHandler = () => {
    if (!selectedNode || !uploadRef.current || !uploadRef.current.files) {
      return;
    }
    const path = getNodePath(selectedNode);
    const file = uploadRef.current.files[0];
    const fr = new FileReader();

    fr.onload = async function () {
      uploadRef.current!.value = '';
      const data = new Uint8Array(fr.result as ArrayBuffer);
      await webR.FS.writeFile(path + '/' + file.name, data);
      await filesInterface.refreshFilesystem();
    };

    fr.readAsArrayBuffer(file as Blob);
  };

  const onDownload: React.MouseEventHandler<HTMLButtonElement> = () => {
    if (!selectedNode) {
      return;
    }
    const path = getNodePath(selectedNode);
    void webR.FS.readFile(path).then((data) => {
      const filename = selectedNode.name;
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
      link.remove();
    });
  };

  const onOpen = async () => {
    if (!selectedNode) {
      return;
    }
    const path = getNodePath(selectedNode);
    await filesInterface.openFileInEditor(selectedNode.name, path, false);
  };

  const onNewDirectory = async () => {
    if (!selectedNode) {
      return;
    }

    const path = getNodePath(selectedNode);
    const name = prompt('Please enter the new directory name');
    if (!name) {
      return;
    }

    try {
      await webR.FS.mkdir(`${path}/${name}`);
    } catch (e) {
      if (e instanceof WebRError) {
        throw new Error(`Unable to create directory: "${path}/${name}".`);
      }
      throw e;
    }
    await filesInterface.refreshFilesystem();
  };

  const onNewFile = async () => {
    if (!selectedNode) {
      return;
    }

    const path = getNodePath(selectedNode);
    const name = prompt('Please enter the new filename');
    if (!name) {
      return;
    }

    try {
      await webR.FS.writeFile(`${path}/${name}`, new Uint8Array([]));
    } catch (e) {
      if (e instanceof WebRError) {
        throw new Error(`Unable to create file: "${path}/${name}".`);
      }
      throw e;
    }
    await filesInterface.refreshFilesystem();
  };

  const onDelete = async () => {
    if (!selectedNode) {
      return;
    }

    const path = getNodePath(selectedNode);
    if (!confirm('Delete ' + selectedNode.name + '?')) {
      return;
    }

    try {
      if (selectedNode.metadata!.type === 'folder') {
        await webR.FS.rmdir(path);
      } else {
        await webR.FS.unlink(path);
      }
    } catch (e) {
      if (e instanceof WebRError) {
        throw new Error(
          `Unable to delete filesystem entry: "${path}". Possibly a non-empty directory?`
        );
      }
      throw e;
    }
    await filesInterface.refreshFilesystem();
    setSelectedNode(null);
  };

  React.useEffect(() => {
    filesInterface.refreshFilesystem = async () => {
      const node = await webR.FS.lookupPath('/');
      const tree = createTreeFromFSNode(node);
      const data = flattenTree({
        name: 'root',
        children: [tree],
        metadata: { type: 'folder' }
      }
      );
      data.forEach((node) => {
        if (node.metadata!.type === 'folder' && node.children.length > 0) {
          node.isBranch = true;
        }
      });
      setTreeData(data);
    };
  }, [filesInterface]);

  const treeView = <TreeView
    data={treeData}
    defaultExpandedIds={[1]}
    selectedIds={selectedIds}
    aria-label="Directory Tree"
    onNodeSelect={onNodeSelect}
    onExpand={onExpand}
    nodeRenderer={nodeRenderer}
    expandOnKeyboardSelect={true}
  />;

  return (
    <div role="region" aria-label="Files Pane" className='files'>
      <div className="files-header">
        <div
          role="toolbar"
          aria-label="Files Toolbar"
          className="files-actions"
        >
          <button
            ref={uploadButtonRef}
            onClick={() => uploadRef.current!.click()}
            className="upload-file"
            disabled={!selectedNode || isFileSelected}
          >
            <Fa.FaFileUpload aria-hidden="true" className="icon" /> Upload file
          </button>
          <button
            onClick={() => { void onNewFile(); }}
            disabled={!selectedNode || isFileSelected}
          >
            <Fa.FaFileAlt aria-hidden="true" className="icon" /> New file
          </button>
          <button
            onClick={() => { void onNewDirectory(); }}
            disabled={!selectedNode || isFileSelected}
          >
            <Fa.FaFolderPlus aria-hidden="true" className="icon" /> New directory
          </button>
          <input onChange={onUpload} ref={uploadRef} type="file" />
          <button
            ref={downloadButtonRef}
            onClick={onDownload}
            className="download-file"
            disabled={!selectedNode || !isFileSelected}
          >
            <Fa.FaFileDownload aria-hidden="true" className="icon" /> Download file
          </button>
          <button
            onClick={() => { void onOpen(); }}
            disabled={!selectedNode || !isFileSelected}
          >
            <Fa.FaFileCode aria-hidden="true" className="icon" /> Open in editor
          </button>
          <button
            onClick={() => { void onDelete(); }}
            disabled={!selectedNode}
          >
            <Fa.FaTimesCircle aria-hidden="true" className="icon" /> Delete
          </button>
        </div>
      </div>
      <div aria-label="WebAssembly Filesystem" className="directory">
        {treeData[0].name ? treeView : undefined}
      </div>
    </div>
  );
}

export default Files;
