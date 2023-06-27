import React from "react";
import { WebR } from "../../webR/webr-main";
import { FaPlay } from "react-icons/fa";
import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment } from "@codemirror/state";
import { TerminalInterface } from '../App';
import { r } from 'codemirror-lang-r';
import "./Editor.css";

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
          className={activeFileIdx === index ? "active" : undefined}
          onClick={() => setActiveFileIdx(index)}
        >
          {f.name}
          <span
            className="editor-closebutton"
            aria-label="Close file"
            onClick={(e) => {
              if (!confirm("Close " + f.name + "?")) {
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
  )
}

export function Editor({
  webR,
  terminalInterface,
}: {
  webR: WebR
  terminalInterface: TerminalInterface;
}) {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = React.useState<EditorView>();
  const [files, setFiles] = React.useState<EditorFile[]>([]);
  const [activeFileIdx, setActiveFileIdx] = React.useState(0);

  const activeFile = files[activeFileIdx];

  const closeFile = (e: React.SyntheticEvent, index: number) => {
    e.stopPropagation();
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
    const prevFile = activeFileIdx - 1;
    setActiveFileIdx(prevFile < 0 ? 0 : prevFile);
  }

  const syncActiveFileState = React.useCallback(() => {
    if (!editorView || !activeFile) return;
    activeFile.ref.editorState = editorView.state;
    activeFile.ref.scrollTop = editorView.scrollDOM.scrollTop;
    activeFile.ref.scrollLeft = editorView.scrollDOM.scrollLeft;
  }, [activeFile, editorView]);

  const runFile = React.useCallback(() => {
    if (!editorView) return;
    syncActiveFileState();
    const code = editorView.state.doc.toString();
    terminalInterface.write('\x1b[2K\r');
    webR.writeConsole(code);
  }, [syncActiveFileState, editorView]);

  React.useEffect(() => {
    if (!editorRef.current) return;
    
    let state = EditorState.create({
      extensions: [
        basicSetup,
        language.of(r()),
        tabSize.of(EditorState.tabSize.of(2))
      ]
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    setEditorView(view);

    setFiles([{
      name: 'Untitled1.R',
      path: '/home/web_user/Untitled.R',
      ref: {
        editorState: state,
      }
    }]);

    return function cleanup() {
      view.destroy();
    };
  }, []);

  React.useEffect(() => {
    if (!editorView || files.length === 0) return;
    editorView.setState(activeFile.ref.editorState);
    editorView.requestMeasure({
      read: () => {
        editorView.scrollDOM.scrollTop = activeFile.ref.scrollTop ?? 0;
        editorView.scrollDOM.scrollLeft = activeFile.ref.scrollLeft ?? 0;
        return editorView.domAtPos(0).node;
      }
    });
    editorView.focus();

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
          <button onClick={runFile}><FaPlay className="icon" /></button>
        </div>
      </div>
      <div className="editor-container" ref={editorRef}></div>
    </div>
  )
}

export default Editor;
