import React from 'react';
import { WebR, RFunction, Shelter } from '../../webR/webr-main';
import { FaPlay, FaRegSave } from 'react-icons/fa';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { FilesInterface, TerminalInterface } from '../App';
import { r } from 'codemirror-lang-r';
import './Editor.css';
import { WebRDataJsAtomic } from '../../webR/robj';
import * as utils from './utils';

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
    <div
      role="tablist"
      aria-label="Currently Open Files"
      className="editor-files"
    >
      {files.map((f, index) =>
        <div
          key={index}
          className={'editor-file' + (activeFileIdx === index ? ' active' : '')}
          role="tab"
          id={`filetab-${index}`}
          aria-label={f.name}
        >
          <button
            className="editor-switch"
            aria-label={`Switch to ${f.name}`}
            onClick={() => setActiveFileIdx(index)}
          >
          </button>
          <div
            className="editor-filename"
            aria-hidden="true"
          >
            {f.name}
          </div>
          <button
            className="editor-close"
            aria-label={`Close ${f.name}`}
            onClick={(e) => {
              if (!f.ref.editorState.readOnly && !confirm('Close ' + f.name + '?')) {
                e.stopPropagation();
                return;
              }
              closeFile(e, index);
            }}
          >
            <div aria-hidden="true">&times;</div>
          </button>
        </div>
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
  const runSelectedCode = React.useRef((): void => {
    throw new Error('Unable to run code, webR not initialised.');
  });

  const activeFile = files[activeFileIdx];
  const isRFile = activeFile && activeFile.name.endsWith('.R');
  const isReadOnly = activeFile && activeFile.ref.editorState.readOnly;

  const completionMethods = React.useRef<null | {
    assignLineBuffer: RFunction;
    assignToken: RFunction;
    assignStart: RFunction;
    assignEnd: RFunction;
    completeToken: RFunction;
    retrieveCompletions: RFunction;
  }>(null);

  React.useEffect(() => {
    let shelter: Shelter | null = null;

    void webR.init().then(async () => {
      shelter = await new webR.Shelter();
      await webR.evalRVoid('rc.settings(func=TRUE, fuzzy=TRUE)');
      completionMethods.current = {
        assignLineBuffer: await shelter.evalR('utils:::.assignLinebuffer') as RFunction,
        assignToken: await shelter.evalR('utils:::.assignToken') as RFunction,
        assignStart: await shelter.evalR('utils:::.assignStart') as RFunction,
        assignEnd: await shelter.evalR('utils:::.assignEnd') as RFunction,
        completeToken: await shelter.evalR('utils:::.completeToken') as RFunction,
        retrieveCompletions: await shelter.evalR('utils:::.retrieveCompletions') as RFunction,
      };
    });

    return function cleanup() {
      if (shelter) void shelter.purge();
    };
  }, []);

  const completion = React.useCallback(async (context: CompletionContext) => {
    if (!completionMethods.current) {
      return null;
    }
    const line = context.state.doc.lineAt(context.state.selection.main.head).text;
    const { from, to, text } = context.matchBefore(/[a-zA-Z0-9_.:]*/) ?? { from: 0, to: 0, text: '' };
    if (from === to && !context.explicit) {
      return null;
    }
    await completionMethods.current.assignLineBuffer(line);
    await completionMethods.current.assignToken(text);
    await completionMethods.current.assignStart(from + 1);
    await completionMethods.current.assignEnd(to + 1);
    await completionMethods.current.completeToken();
    const compl = await completionMethods.current.retrieveCompletions() as WebRDataJsAtomic<string>;
    const options = compl.values.map((val) => {
      if (!val) {
        throw new Error('Missing values in completion result.');
      }
      return { label: val };
    });

    return { from: from, options };
  }, []);

  const editorExtensions = [
    basicSetup,
    language.of(r()),
    tabSize.of(EditorState.tabSize.of(2)),
    Prec.high(
      keymap.of([
        indentWithTab,
        {
          key: 'Mod-Enter',
          run: () => {
            if (!runSelectedCode.current) return false;
            runSelectedCode.current();
            return true;
          },
        },
      ]
      )),
    autocompletion({ override: [completion] })
  ];

  const closeFile = (e: React.SyntheticEvent, index: number) => {
    e.stopPropagation();
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
    const prevFile = activeFileIdx - 1;
    setActiveFileIdx(prevFile < 0 ? 0 : prevFile);
  };

  React.useEffect(() => {
    runSelectedCode.current = (): void => {
      if (!editorView) {
        return;
      }
      let code = utils.getSelectedText(editorView);
      if (code === '') {
        code = utils.getCurrentLineText(editorView);
        utils.moveCursorToNextLine(editorView);
      }

      const codeArray = new TextEncoder().encode(code);
      webR.FS.writeFile('/tmp/.webRtmp-source', codeArray).then(() => {
        webR.writeConsole("source('/tmp/.webRtmp-source', echo = TRUE, max.deparse.length = Inf)");
      }, (reason) => {
        console.error(reason);
        throw new Error(`Can't run selected R code. See the JavaScript console for details.`);
      });
    };
  }, [editorView]);

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

    const codeArray = new TextEncoder().encode(code);
    webR.FS.writeFile('/tmp/.webRtmp-source', codeArray).then(() => {
      webR.writeConsole("source('/tmp/.webRtmp-source', echo = TRUE, max.deparse.length = Inf)");
    }, (reason) => {
      console.error(reason);
      throw new Error(`Can't run selected R code. See the JavaScript console for details.`);
    });
  }, [syncActiveFileState, editorView]);

  const saveFile: React.MouseEventHandler<HTMLButtonElement> = React.useCallback(() => {
    if (!editorView) {
      return;
    }

    syncActiveFileState();
    const code = editorView.state.doc.toString();
    const data = new TextEncoder().encode(code);

    webR.FS.writeFile(activeFile.path, data).then(() => {
      void filesInterface.refreshFilesystem();
    }, (reason) => {
      console.error(reason);
      throw new Error(`Can't save editor contents. See the JavaScript console for details.`);
    });
  }, [syncActiveFileState, editorView]);

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
        while (content.match(/.[\b]/)) {
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
        setActiveFileIdx(index - 1);
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

    // Update accessibility labelling
    const container = editorView.contentDOM.parentElement;
    container?.setAttribute('role', 'tabpanel');
    container?.setAttribute('aria-labelledby', `filetab-${activeFileIdx}`);

    // Before switching to a new file, save the state and scroll position
    return function cleanup() {
      syncActiveFileState();
    };
  }, [files, syncActiveFileState, activeFile, editorView]);

  const displayStyle = files.length === 0 ? { display: 'none' } : undefined;

  return (
    <div role="region"
      aria-label="Editor Pane"
      className="editor"
      style={displayStyle}
    >
      <div className="editor-header">
        <FileTabs
          files={files}
          activeFileIdx={activeFileIdx}
          setActiveFileIdx={setActiveFileIdx}
          closeFile={closeFile}
        />
      </div>
      <div
        aria-label="Editor"
        aria-describedby="editor-desc"
        className="editor-container"
        ref={editorRef}
      >
      </div>
      <p style={{ display: 'none' }} id="editor-desc">
        This component is an instance of the <a href="https://codemirror.net/">CodeMirror</a> interactive text editor.
        The editor has been configured so that the Tab key controls the indentation of code.
        To move focus away from the editor, press the Escape key, and then press the Tab key directly after it.
        Escape and then Shift-Tab can also be used to move focus backwards.
      </p>
      <div
        role="toolbar"
        aria-label="Editor Toolbar"
        className="editor-actions"
      >
        {isRFile && <button onClick={runFile}>
          <FaPlay aria-hidden="true" className="icon" /> Run
        </button>}
        {!isReadOnly && <button onClick={saveFile}>
          <FaRegSave aria-hidden="true" className="icon" /> Save
        </button>}
      </div>
    </div>
  );
}

export default Editor;
