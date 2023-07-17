import React, { ChangeEventHandler } from 'react';
import * as Fa from 'react-icons/fa';
import TreeView, { flattenTree, INode, ITreeViewProps } from 'react-accessible-treeview';
import { WebR, WebRError } from '../../webR/webr-main';
import type { FSNode } from '../../webR/webr-main';
import { FilesInterface } from '../App';
import './Files.css';

const FolderIcon = ({ isOpen }: { isOpen: boolean }) => isOpen
  ? <Fa.FaFolderOpen color="e8a87c" className="icon" />
  : <Fa.FaFolder color="e8a87c" className="icon" />;

interface ITreeNode {
  id: number
  name: string;
  children?: ITreeNode[];
  metadata?: { [x: string]: string | number | null | undefined };
}

/* Convert a VFS node from Emscripten's FS API into a `ITreeNode`, so that it
 * can be displayed by react-accessible-treeview.
 */
export function createTreefromFSNode(fsNode: FSNode): ITreeNode {
  const tree: ITreeNode = {
    id: fsNode.id,
    name: fsNode.name,
    metadata: { type: fsNode.isFolder ? 'folder' : 'file' },
  };
  if (fsNode.isFolder) {
    tree.children = Object.entries(fsNode.contents).map(([, node]) =>
      createTreefromFSNode(node)
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
  const uploadRef = React.useRef<HTMLInputElement | null>(null);
  const uploadButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const downloadButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const nodeRenderer: ITreeViewProps['nodeRenderer'] = ({
    element,
    isExpanded,
    isBranch,
    getNodeProps,
    level,
  }) => (
    <div {...getNodeProps()} style={{ paddingLeft: 20 * (level - 1) }}>
      { isBranch ? <FolderIcon isOpen={ isExpanded } /> : <Fa.FaRegFile className="icon" />}
      { element.name }
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
    setIsFileSelected(!element.isBranch);
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
    webR.FS.readFile(path).then((data) => {
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

  const onOpen = () => {
    if (!selectedNode) {
      return;
    }
    const path = getNodePath(selectedNode);
    filesInterface.openFileInEditor(selectedNode.name, path, false);
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
      if (selectedNode.isBranch) {
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
      const tree = createTreefromFSNode(node);
      const data = flattenTree({
        name: 'root',
        children: [tree],
        metadata: {type: 'folder'}}
      );
      data.forEach((node) => {
        if ( node.metadata!.type === 'folder') {
          node.isBranch = true;
        }
      });
      setTreeData(data);
    };
  }, [filesInterface]);

  return (
    <div className='files'>
      <div className="files-header">
        <div className="files-actions">
          <button
            ref={uploadButtonRef}
            onClick={() => uploadRef.current!.click()}
            className="upload-file"
            disabled={!selectedNode || isFileSelected}
          >
              <Fa.FaFileUpload className="icon" /> Upload file
          </button>
          <button
            onClick={() => { onNewFile(); }}
            disabled={!selectedNode || isFileSelected}
          >
            <Fa.FaFileAlt className="icon" /> New file
          </button>
          <button
            onClick={() => { onNewDirectory(); }}
            disabled={!selectedNode || isFileSelected}
          >
            <Fa.FaFolderPlus className="icon" /> New directory
          </button>
          <input onChange={onUpload} ref={uploadRef} type="file"/>
          <button
            ref={downloadButtonRef}
            onClick={onDownload}
            className="download-file"
            disabled={!selectedNode || !isFileSelected}
          >
            <Fa.FaFileDownload className="icon" /> Download file
          </button>
          <button
            onClick={onOpen}
            disabled={!selectedNode || !isFileSelected}
          >
            <Fa.FaFileCode className="icon" /> Open in editor
          </button>
          <button
            onClick={() => { onDelete(); }}
            disabled={!selectedNode}
          >
          <Fa.FaTimesCircle className="icon" /> Delete
          </button>
        </div>
      </div>
      <div className="directory">
        <TreeView
          data={treeData}
          defaultExpandedIds={[1]}
          aria-label="directory tree"
          onNodeSelect={onNodeSelect}
          nodeRenderer={nodeRenderer}
        />
      </div>
    </div>
  );
}

export default Files;
