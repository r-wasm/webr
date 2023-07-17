import React from 'react';
import { WebR } from '../../webR/webr-main';
import { FaPlay, FaRegSave } from 'react-icons/fa';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { FilesInterface, TerminalInterface } from '../App';
import { r } from 'codemirror-lang-r';
import './Editor.css';

const language = new Compartment();
const tabSize = new Compartment();

export type EditorFile = {
  name: string;
  path: string;
  ref: {
    editorState: EditorState;
    scrollTop?: number;
    scrollLeft?: number;
  }
};

export function FileTabs({
  files,
  activeFileIdx,
  setActiveFileIdx,
  closeFile
}: {
  files: EditorFile[];
  activeFileIdx: number;
  setActiveFileIdx: React.Dispatch<React.SetStateAction<number>>;
  closeFile: (e: React.SyntheticEvent, index: number) => void;
}) {
  return (
    <div className="editor-files">
      {files.map((f, index) =>
        <button
          key={index}
          className={activeFileIdx === index ? 'active' : undefined}
          onClick={() => setActiveFileIdx(index)}
        >
          {f.name}
          <span
            className="editor-closebutton"
            aria-label="Close file"
            onClick={(e) => {
              if (!f.ref.editorState.readOnly && !confirm('Close ' + f.name + '?')) {
                e.stopPropagation();
                return;
              }
              closeFile(e, index);
            }}
          >
            &times;
          </span>
        </button>
      )}
    </div>
  );
}

export function Editor({
  webR,
  terminalInterface,
  filesInterface,
}: {
  webR: WebR
  terminalInterface: TerminalInterface;
  filesInterface: FilesInterface;
}) {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = React.useState<EditorView>();
  const [files, setFiles] = React.useState<EditorFile[]>([]);
  const [activeFileIdx, setActiveFileIdx] = React.useState(0);

  const activeFile = files[activeFileIdx];
  const isRFile = activeFile && activeFile.name.endsWith('.R');
  const isReadOnly = activeFile && activeFile.ref.editorState.readOnly;

  const editorExtensions = [
    basicSetup,
    language.of(r()),
    tabSize.of(EditorState.tabSize.of(2))
  ];

  const closeFile = (e: React.SyntheticEvent, index: number) => {
    e.stopPropagation();
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
    const prevFile = activeFileIdx - 1;
    setActiveFileIdx(prevFile < 0 ? 0 : prevFile);
  };

  const syncActiveFileState = React.useCallback(() => {
    if (!editorView || !activeFile) {
      return;
    }
    activeFile.ref.editorState = editorView.state;
    activeFile.ref.scrollTop = editorView.scrollDOM.scrollTop;
    activeFile.ref.scrollLeft = editorView.scrollDOM.scrollLeft;
  }, [activeFile, editorView]);

  const runFile = React.useCallback(() => {
    if (!editorView) {
      return;
    }
    syncActiveFileState();
    const code = editorView.state.doc.toString();
    terminalInterface.write('\x1b[2K\r');
    webR.writeConsole(code);
  }, [syncActiveFileState, editorView]);

  const saveFile: React.MouseEventHandler<HTMLButtonElement> = React.useCallback(() => {
    if (!editorView) {
      return;
    }
    (async () => {
      syncActiveFileState();
      const code = editorView.state.doc.toString();
      const data = new TextEncoder().encode(code);
      await webR.FS.writeFile(activeFile.path, data);
      filesInterface.refreshFilesystem();
    })();
  }, [webR, syncActiveFileState, editorView]);

  React.useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const state = EditorState.create({ extensions: editorExtensions });
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    setEditorView(view);

    setFiles([{
      name: 'Untitled1.R',
      path: '/home/web_user/Untitled1.R',
      ref: {
        editorState: state,
      }
    }]);

    return function cleanup() {
      view.destroy();
    };
  }, []);

  /*
   * Register this component with the files interface so that when it comes to
   * opening files they are displayed in this codemirror instance.
   */
  React.useEffect(() => {
    filesInterface.openFileInEditor = (name: string, path: string, readOnly: boolean) => {
      // Don't reopen the file if it's already open, switch to that tab instead
      const existsIndex = files.findIndex((f) => f.path === path);
      if (existsIndex >= 0) {
        setActiveFileIdx(existsIndex);
        return Promise.resolve();
      }

      return webR.FS.readFile(path).then((data) => {
        syncActiveFileState();
        const updatedFiles = [...files];
        const extensions = name.toLowerCase().endsWith('.r') ? editorExtensions : [];
        if (readOnly) extensions.push(EditorState.readOnly.of(true));

        // Get file content, dealing with backspace characters until none remain
        let content = new TextDecoder().decode(data);
        while(content.match(/.[\b]/)){
          content = content.replace(/.[\b]/g, '');
        }

        // Add this new file content to the list of open files
        const index = updatedFiles.push({
          name,
          path,
          ref: {
            editorState: EditorState.create({
              doc: content,
              extensions,
            }),
          }
        });
        setFiles(updatedFiles);
        setActiveFileIdx(index-1);
      });
    };
  }, [files, filesInterface]);

  React.useEffect(() => {
    if (!editorView || files.length === 0) {
      return;
    }
    // Update the editor's state and scroll position for currently active file
    editorView.setState(activeFile.ref.editorState);
    editorView.requestMeasure({
      read: () => {
        editorView.scrollDOM.scrollTop = activeFile.ref.scrollTop ?? 0;
        editorView.scrollDOM.scrollLeft = activeFile.ref.scrollLeft ?? 0;
        return editorView.domAtPos(0).node;
      }
    });
    editorView.focus();

    // Before switching to a new file, save the state and scroll position
    return function cleanup() {
      syncActiveFileState();
    };
  }, [files, syncActiveFileState, activeFile, editorView]);

  const displayStyle = files.length === 0 ? { display: 'none' } : undefined;

  return (
    <div className="editor" style={displayStyle}>
      <div className="editor-header">
        <FileTabs
          files={files}
          activeFileIdx={activeFileIdx}
          setActiveFileIdx={setActiveFileIdx}
          closeFile={closeFile}
        />
        <div className="editor-actions">
          {!isReadOnly && <button onClick={saveFile}>
            <FaRegSave className="icon" /> Save
          </button>}
          {isRFile && <button onClick={runFile}><FaPlay className="icon" /> Run</button>}
        </div>
      </div>
      <div className="editor-container" ref={editorRef}></div>
    </div>
  );
}

export default Editor;
