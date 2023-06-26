import React, { ChangeEventHandler } from "react";
import { FaRegFile, FaFolder, FaFolderOpen } from "react-icons/fa";
import TreeView, { flattenTree, INode, ITreeViewProps } from "react-accessible-treeview";
import { WebR } from "../../webR/webr-main";
import type { FSNode } from '../../webR/webr-main';
import { FilesInterface } from '../App';
import "./Files.css";

const FolderIcon = ({ isOpen }: { isOpen: boolean }) => isOpen
  ? <FaFolderOpen color="e8a87c" className="icon" />
  : <FaFolder color="e8a87c" className="icon" />;

interface ITreeNode {
  name: string;
  children?: ITreeNode[];
  metadata?: { [x: string]: string | number | null | undefined };
}

export function createTreefromFSNode(fsNode: FSNode): ITreeNode {
  const tree: ITreeNode = {
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

const initialData = flattenTree({ name: "", children: [] });

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

  const nodeRenderer: ITreeViewProps["nodeRenderer"] = ({
    element,
    isExpanded,
    isBranch,
    getNodeProps,
    level,
  }) => (
    <div {...getNodeProps()} style={{ paddingLeft: 20 * (level - 1) }}>
      { isBranch ? <FolderIcon isOpen={ isExpanded } /> : <FaRegFile className="icon" />}
      { element.name }
    </div>
  )

  const getNodePath = (node?: INode): string => {
    if (!node || !node.parent) return '';
    const prefix = node.parent
      ? getNodePath(treeData.find((value) => value.id === node.parent))
      : '';
    return `${prefix}/${node.name}`;
  }

  const onNodeSelect: ITreeViewProps["onNodeSelect"] = ({ element }) => {
    setSelectedNode(element);
    setIsFileSelected(!element.isBranch);
  }

  const onUpload: ChangeEventHandler = () => {
    if (!selectedNode) return;
    if (!uploadRef.current || !uploadRef.current.files || uploadRef.current.files.length === 0) {
      return;
    }
    const path = getNodePath(selectedNode);
    const file = uploadRef.current.files[0];
    const fr = new FileReader();

    fr.onload = async function () {
      uploadRef.current!.value = '';
      const data = new Uint8Array(fr.result as ArrayBuffer);
      await webR.FS.writeFile(path + '/' + file.name, data);
      filesInterface.refreshFilesystem();
    };

    fr.readAsArrayBuffer(file as Blob);
  }

  const onDownload: React.MouseEventHandler<HTMLButtonElement> = () => {
    if (!selectedNode) return;
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
  }

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
      <div className="top-bar">
          <button
            ref={uploadButtonRef} 
            onClick={() => uploadRef.current!.click()}
            className="upload-file"
            disabled={isFileSelected}
          >
              Upload File
          </button>
          <input onChange={onUpload} ref={uploadRef} type="file"/>
          <button
            ref={downloadButtonRef}
            onClick={onDownload}
            className="download-file"
            disabled={!isFileSelected}
          >
            Download File
          </button>
      </div>
      <div className="directory">
        <TreeView
          data={treeData}
          defaultExpandedIds={[1]}
          aria-label="directory tree"
          onNodeSelect = {onNodeSelect}
          nodeRenderer={nodeRenderer}
        />
      </div>
    </div>
  );
}

export default Files;
