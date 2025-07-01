import React from 'react';
import { WebR, RFunction, Shelter } from '../../webR/webr-main';
import { FaPlay, FaRegSave } from 'react-icons/fa';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { Panel } from 'react-resizable-panels';
import { FilesInterface, TerminalInterface } from '../App';
import { r } from 'codemirror-lang-r';
import { NamedObject, WebRDataJsAtomic } from '../../webR/robj';
import DataGrid from 'react-data-grid';
import * as utils from './utils';
import 'react-data-grid/lib/styles.css';
import './Editor.css';
import { deflate, inflate } from "pako";
import { encode, decode } from '@msgpack/msgpack';
import { bufferToBase64, base64ToBuffer } from '../../webR/utils';

const language = new Compartment();
const tabSize = new Compartment();

type EditorBase = { name: string, readOnly: boolean };
type EditorData = EditorBase & {
  type: "data",
  data: {
    columns: { key: string, name: string }[];
    rows: { [key: string]: string }[];
  }
};

type EditorHtml = EditorBase & {
  path: string;
  type: "html",
  readOnly: boolean,
  frame: HTMLIFrameElement,
};

type EditorFile = EditorBase & {
  path: string;
  type: "text",
  readOnly: boolean,
  dirty: boolean;
  editorState: EditorState;
  scrollTop?: number;
  scrollLeft?: number;
};

export interface ShareItem {
  name: string;
  path: string;
  data: Uint8Array;
}

export function isShareItems(files: any): files is ShareItem[] {
  return Array.isArray(files) && files.every((file) =>
    'name' in file &&
    typeof file.name === 'string' &&
    'path' in file &&
    typeof file.path === 'string' &&
    'data' in file &&
    file.data instanceof Uint8Array
  )
}

export type EditorItem = EditorData | EditorHtml | EditorFile;

export function FileTabs({
  files,
  activeFileIdx,
  setActiveFileIdx,
  focusEditor,
  closeFile,
}: {
  files: EditorItem[];
  activeFileIdx: number;
  setActiveFileIdx: React.Dispatch<React.SetStateAction<number>>;
  focusEditor: () => void;
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
            onClick={() => {
              setActiveFileIdx(index);
              setTimeout(focusEditor, 0);
            }}
          >
          </button>
          <div
            className="editor-filename"
            aria-hidden="true"
          >
            {f.name}{f.type === "text" && !f.readOnly && f.dirty ? '*' : null}
          </div>
          <button
            className="editor-close"
            aria-label={`Close ${f.name}`}
            onClick={(e) => {
              if (!f.readOnly && !confirm('Close ' + f.name + '?')) {
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
  const htmlRef = React.useRef<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = React.useState<EditorView>();
  const [files, setFiles] = React.useState<EditorItem[]>([]);
  const [activeFileIdx, setActiveFileIdx] = React.useState(0);
  const runSelectedCode = React.useRef((): void => {
    throw new Error('Unable to run code, webR not initialised.');
  });
  const saveCurrentFile = React.useRef((): void => {
    throw new Error('Unable to save file, editor not properly initialized.');
  });
  const setCurrentFileDirty = React.useRef((_: boolean): void => {
    throw new Error('Unable to update file, editor not properly initialized.');
  });

  const activeFile = files[activeFileIdx];
  const isScript = activeFile && activeFile.type === "text" && activeFile.path.endsWith('.R');
  const isData = activeFile && activeFile.type === "data";
  const isHtml = activeFile && activeFile.type === "html";
  const isReadOnly = activeFile && activeFile.readOnly;

  const completionMethods = React.useRef<null | {
    assignLineBuffer: RFunction;
    assignToken: RFunction;
    assignStart: RFunction;
    assignEnd: RFunction;
    completeToken: RFunction;
    retrieveCompletions: RFunction;
  }>(null);

  const editorToShareData = async (files: EditorItem[]): Promise<string> => {
    const shareFiles: ShareItem[] = await Promise.all(
      files.filter((file): file is EditorFile => file.type === "text" && !file.readOnly)
        .map(async (file) => ({
          name: file.name,
          path: file.path,
          data: await webR.FS.readFile(file.path)
        }))
    );
    const compressed = deflate(encode(shareFiles));
    return bufferToBase64(compressed);
  };

  const shareDataToEditorItems = async (data: string): Promise<EditorItem[]> => {
    const buffer = base64ToBuffer(data);
    const items = decode(inflate(buffer));
    if (!isShareItems(items)) {
      throw new Error("Provided URL data is not a valid set of share files.");
    }

    void Promise.all(items.map(async ({ path, data }) => await webR.FS.writeFile(path, data)));
    return items.map((file) => {
      const extensions = file.name.toLowerCase().endsWith('.r') ? scriptExtensions : editorExtensions;
      const state = EditorState.create({
        doc: new TextDecoder().decode(file.data),
        extensions
      });
      return {
        name: file.name,
        readOnly: false,
        path: file.path,
        type: "text",
        dirty: false,
        editorState: state,
      };
    });
  }

  React.useEffect(() => {
    let shelter: Shelter | null = null;

    // Load files from URL, if a share code has been provided
    const updateFilesFromURL = async (url: URL) => {
      const shareHash = url.hash.match(/(code)=(.*)/);
      if (shareHash && shareHash[1] === 'code') {
      const items = await shareDataToEditorItems(shareHash[2]);
      void filesInterface.refreshFilesystem();
      setFiles(items);
      }
    }

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

      const url = new URL(window.location.href);
      updateFilesFromURL(url);
    });

    addEventListener("hashchange", (event: HashChangeEvent) => {
      const url = new URL(event.newURL);
      updateFilesFromURL(url);
    })

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
    await completionMethods.current.assignLineBuffer(line.replace(/\)+$/, ""));
    await completionMethods.current.assignToken(text);
    await completionMethods.current.assignStart(from + 1);
    await completionMethods.current.assignEnd(to + 1);
    await completionMethods.current.completeToken();
    const compl = await completionMethods.current.retrieveCompletions() as WebRDataJsAtomic<string>;
    const options = compl.values.map((val) => {
      if (!val) {
        throw new Error('Missing values in completion result.');
      }
      return { label: val, boost: val.endsWith("=") ? 10 : 0 };
    });

    return { from: from, options };
  }, []);

  const editorExtensions = [
    basicSetup,
    tabSize.of(EditorState.tabSize.of(2)),
    Prec.high(
      keymap.of([
        indentWithTab,
        {
          key: 'Mod-s',
          run: () => {
            saveCurrentFile.current();
            return true;
          },
        },
      ])
    ),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        setCurrentFileDirty.current(true);
      }
    }),
  ];

  const scriptExtensions = [
    editorExtensions,
    language.of(r()),
    Prec.high(
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            runSelectedCode.current();
            return true;
          },
        },
      ])
    ),
    autocompletion({ override: [completion] })
  ];

  const closeFile = (e: React.SyntheticEvent, index: number) => {
    e.stopPropagation();
    const item = files[index];
    if (item.type === "html") {
      item.frame.remove();
    }

    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
    if (index <= activeFileIdx) {
      const prevFile = activeFileIdx - 1;
      setActiveFileIdx(prevFile < 0 ? 0 : prevFile);
    }
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
    if (activeFile.type === "text") {
      activeFile.editorState = editorView.state;
      activeFile.scrollTop = editorView.scrollDOM.scrollTop;
      activeFile.scrollLeft = editorView.scrollDOM.scrollLeft;
    }
  }, [activeFile, editorView]);

  const setFileDirty = React.useCallback((dirty: boolean) => {
    setFiles(prevFiles =>
      prevFiles.map((file, index) => {
        if (editorView && index === activeFileIdx && file.type === "text") {
          file.scrollTop = editorView.scrollDOM.scrollTop;
          file.scrollLeft = editorView.scrollDOM.scrollLeft;
          return {
            ...file,
            editorState: editorView.state,
            scrollTop: editorView.scrollDOM.scrollTop,
            scrollLeft: editorView.scrollDOM.scrollLeft,
            dirty
          }
        }
        return file;
      })
    );
  }, [activeFileIdx, editorView]);

  React.useEffect(() => {
    setCurrentFileDirty.current = (dirty: boolean): void => {
      setFileDirty(dirty);
    };
  }, [setFileDirty, editorView, activeFile]);

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

  const saveFile = React.useCallback(async () => {
    if (!editorView || activeFile.type !== "text" || activeFile.readOnly) {
      return;
    }

    syncActiveFileState();
    const content = editorView.state.doc.toString();
    const data = new TextEncoder().encode(content);

    try {
      await webR.FS.writeFile(activeFile.path, data);
      void filesInterface.refreshFilesystem();
      setFileDirty(false);
    } catch (err) {
      setFileDirty(true)
      console.error(err);
      throw new Error(`Can't save editor contents. See the JavaScript console for details.`);
    }
  }, [syncActiveFileState, editorView]);

  React.useEffect(() => {
    saveCurrentFile.current = (): void => {
      saveFile();
    };
  }, [saveFile, editorView, activeFile]);

  const focusEditor = React.useCallback(() => {
    if (editorView) {
      editorView.focus();
    }
  }, [editorView]);

  React.useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const state = EditorState.create({ extensions: scriptExtensions });
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    setEditorView(view);

    setFiles([{
      name: 'Untitled1.R',
      path: '/home/web_user/Untitled1.R',
      type: 'text',
      readOnly: false,
      dirty: true,
      editorState: state,
    }]);

    return function cleanup() {
      view.destroy();
    };
  }, []);


  /*
   * Update the share URL as active files are saved
   */
  React.useEffect(() => {
    const shouldUpdate = files.filter((file): file is EditorFile => file.type === 'text').every((file) => !file.dirty);
    if (files.length > 0 && shouldUpdate) {
      editorToShareData(files).then((shareData) => {
        const url = new URL(window.location.href);
        url.hash = `code=${shareData}`;
        window.history.pushState({}, '', url.toString());
      });
    }
  }, [files]);

  /*
   * Register this component with the files interface so that when it comes to
   * opening files they are displayed in this codemirror instance.
   */
  React.useEffect(() => {
    filesInterface.openDataInEditor = (title: string, data: NamedObject<WebRDataJsAtomic<string>>) => {
      // If data is there switch to that tab instead
      const existsIndex = files.findIndex((f) => f.name === title);
      if (existsIndex >= 0) {
        setActiveFileIdx(existsIndex);
        return;
      }

      syncActiveFileState();

      const columns = Object.keys(data).map((key) => {
        return { key, name: key === "row.names" ? "" : key };
      });

      const rows = Object.entries(data).reduce((a, entry) => {
        entry[1].values.forEach((v, j) => a[j] = Object.assign(a[j] || {}, { [entry[0]!]: v }));
        return a;
      }, []);

      const updatedFiles = [...files];
      const index = updatedFiles.push({
        name: title,
        type: "data",
        readOnly: true,
        data: { columns, rows }
      });
      setFiles(updatedFiles);
      setActiveFileIdx(index - 1);
    };

    filesInterface.openHtmlInEditor = (src: string, path: string) => {
      syncActiveFileState();

      const frame = document.createElement('iframe');
      frame.srcdoc = src;
      frame.className = "html-viewer";
      htmlRef.current!.appendChild(frame);

      const updatedFiles = [...files];
      const index = updatedFiles.push({
        name: 'Viewer',
        path,
        type: "html",
        readOnly: true,
        frame,
      });
      setFiles(updatedFiles);
      setActiveFileIdx(index - 1);
    };

    filesInterface.openFileInEditor = (name: string, path: string, readOnly: boolean) => {
      // Don't reopen the file if it's already open, switch to that tab instead
      const existsIndex = files.findIndex((f) => "path" in f && f.path === path);
      if (existsIndex >= 0) {
        setActiveFileIdx(existsIndex);
        return Promise.resolve();
      }

      return webR.FS.readFile(path).then((data) => {
        syncActiveFileState();
        const updatedFiles = [...files];
        const extensions = name.toLowerCase().endsWith('.r') ? scriptExtensions : editorExtensions;
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
          type: "text",
          readOnly,
          dirty: false,
          editorState: EditorState.create({
            doc: content,
            extensions,
          }),
        });
        setFiles(updatedFiles);
        setActiveFileIdx(index - 1);
      });
    };
  }, [files, filesInterface]);

  React.useEffect(() => {
    if (activeFile && activeFile.type === "html") {
      activeFile.frame.classList.remove("d-none");
    }
    // Before switching activeFile, hide this HTML
    return function cleanup() {
      if (activeFile && activeFile.type === "html") {
        activeFile.frame.classList.add("d-none");
      }
    };
  }, [activeFile]);

  React.useEffect(() => {
    if (!editorView || files.length === 0) {
      return;
    }
    // Update the editor's state and scroll position for currently active file
    if (activeFile.type === "text") {
      editorView.setState(activeFile.editorState);
      editorView.requestMeasure({
        read: () => {
          editorView.scrollDOM.scrollTop = activeFile.scrollTop ?? 0;
          editorView.scrollDOM.scrollLeft = activeFile.scrollLeft ?? 0;
          return editorView.domAtPos(0).node;
        }
      });
    }

    // Update accessibility labelling
    const container = editorView.contentDOM.parentElement;
    container?.setAttribute('role', 'tabpanel');
    container?.setAttribute('aria-labelledby', `filetab-${activeFileIdx}`);

    // Before switching to a new file, save the state and scroll position
    return function cleanup() {
      syncActiveFileState();
    };
  }, [files, syncActiveFileState, activeFile, editorView]);

  return (
    <Panel
      id="editor"
      role="region"
      aria-label="Editor Pane"
      order={1}
      minSize={20}
      className={files.length === 0 ? "d-none" : ""}
    >
      <div className="editor-header">
        <FileTabs
          files={files}
          activeFileIdx={activeFileIdx}
          setActiveFileIdx={setActiveFileIdx}
          closeFile={closeFile}
          focusEditor={focusEditor}
        />
      </div>
      <div
        aria-label="Editor"
        aria-describedby="editor-desc"
        className={`editor-container ${(isData || isHtml) ? "d-none" : ""}`}
        ref={editorRef}
      >
      </div>
      <p className="d-none" id="editor-desc">
        This component is an instance of the <a href="https://codemirror.net/">CodeMirror</a> interactive text editor.
        The editor has been configured so that the Tab key controls the indentation of code.
        To move focus away from the editor, press the Escape key, and then press the Tab key directly after it.
        Escape and then Shift-Tab can also be used to move focus backwards.
      </p>
      {(isData && activeFile.data) &&
        <DataGrid
          aria-label="Data viewer"
          columns={activeFile.data.columns}
          rows={activeFile.data.rows}
          className="data-container"
          defaultColumnOptions={{
            sortable: true,
            resizable: true
          }}
        />
      }
      <div
        className={`html-viewer-container ${isHtml ? "" : "d-none"}`}
        ref={htmlRef}
      ></div>
      <div
        role="toolbar"
        aria-label="Editor Toolbar"
        className="editor-actions"
      >
        {isScript && <button onClick={runFile}>
          <FaPlay aria-hidden="true" className="icon" /> Run
        </button>}
        {!isReadOnly && <button onClick={saveFile}>
          <FaRegSave aria-hidden="true" className="icon" /> Save
        </button>}
      </div>
    </Panel>
  );
}

export default Editor;
