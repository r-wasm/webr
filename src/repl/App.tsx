import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import Terminal from './components/Terminal';
import Editor, { EditorItem } from './components/Editor';
import Plot from './components/Plot';
import Files from './components/Files';
import { Readline } from 'xterm-readline';
import { ChannelType, WebR } from '../webR/webr-main';
import { bufferToBase64, promiseHandles } from '../webR/utils';
import { CanvasMessage, PagerMessage, ViewMessage, BrowseMessage } from '../webR/webr-chan';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import './App.css';
import { NamedObject, WebRDataJsAtomic } from '../webR/robj';
import { decodeShareData, isShareItems, ShareItem } from './components/Share';

const urlParams = new URLSearchParams(window.location.search);
const channel = urlParams.get("channel") as keyof typeof ChannelType || "Automatic";

const webR = new WebR({
  RArgs: [],
  REnv: {
    R_HOME: '/usr/lib/R',
    FONTCONFIG_PATH: '/etc/fonts',
    R_ENABLE_JIT: '0',
    COLORTERM: 'truecolor',
  },
  channelType: ChannelType[channel],
});
(globalThis as any).webR = webR;
const encoder = new TextEncoder();
const startup = promiseHandles();

export interface TerminalInterface {
  println: Readline['println'];
  read: Readline['read'];
  write: Readline['write'];
}

export interface FilesInterface {
  refreshFilesystem: () => Promise<void>;
  openFilesInEditor: (openFiles: {
    name: string,
    path: string,
    readOnly?: boolean,
    forceRead?: boolean,
    execute?: boolean,
  }[], replace?: boolean) => Promise<void>;
  openContentInEditor: (openFiles: { name: string, content: Uint8Array }[], replace?: boolean) => void;
  openDataInEditor: (title: string, data: NamedObject<WebRDataJsAtomic<string>>) => void;
  openHtmlInEditor: (src: string, path: string) => void;
}

export interface PlotInterface {
  resize: (direction: "width" | "height", px: number) => void;
  newPlot: () => void;
  drawImage: (img: ImageBitmap) => void;
}

const terminalInterface: TerminalInterface = {
  println: (msg: string) => { console.log(msg); },
  read: () => Promise.reject(new Error('Unable to read from webR terminal.')),
  write: (msg: string) => { console.log(msg); },
};

const filesInterface: FilesInterface = {
  refreshFilesystem: () => Promise.resolve(),
  openFilesInEditor: () => { throw new Error('Unable to open file(s), editor not initialised.'); },
  openContentInEditor: () => { throw new Error('Unable to show content, editor not initialised.'); },
  openDataInEditor: () => { throw new Error('Unable to view data, editor not initialised.'); },
  openHtmlInEditor: () => { throw new Error('Unable to view HTML, editor not initialised.'); },
};

const plotInterface: PlotInterface = {
  resize: () => { return; },
  newPlot: () => { return; },
  drawImage: () => {
    throw new Error('Unable to plot, plotting not initialised.');
  },
};

function handleCanvasMessage(msg: CanvasMessage) {
  if (msg.data.event === 'canvasImage') {
    plotInterface.drawImage(msg.data.image);
  } else if (msg.data.event === 'canvasNewPage') {
    plotInterface.newPlot();
  }
}

async function handlePagerMessage(msg: PagerMessage) {
  const { path, title, deleteFile } = msg.data;
  await filesInterface.openFilesInEditor([{ name: title, path, readOnly: true }]);
  if (deleteFile) {
    await webR.FS.unlink(path);
  }
}

async function handleBrowseMessage(msg: BrowseMessage) {
  const { url } = msg.data;
  const root = url.split('/').slice(0, -1).join('/');
  const decoder = new TextDecoder('utf8');
  let content = decoder.decode(await webR.FS.readFile(url));

  // Replace relative URLs in HTML output with the contents of the VFS.
  /* TODO: This should really be handled by a custom print method sending the
   *       entire R object reference to the main thread, rather than performing
   *       regex on HTML -- famously a bad idea because HTML is context-free.
   *       Saying that, this does seem to work reasonably well for now.
   *
   *       Since we don't load the `webr` support package by default, the
   *       alternative looks to be using hacks to register a bunch of custom S3
   *       generics like `print.htmlwidget` in the "webr_shim" namespace, and
   *       then maintain the `search()` order as other packages are loaded so
   *       that our namespace is always at the front, messy.
   */
  const jsRegex = /<script.*src=["'`](.+\.js)["'`].*>.*<\/script>/g;
  const jsMatches = Array.from(content.matchAll(jsRegex) || []);
  const jsContent: { [idx: number]: string } = {};
  await Promise.all(jsMatches.map((match, idx) => {
    return webR.FS.readFile(`${root}/${match[1]}`)
      .then((file) => bufferToBase64(file))
      .then((enc) => {
        jsContent[idx] = "data:text/javascript;base64," + enc;
      });
  }));
  jsMatches.forEach((match, idx) => {
    content = content.replace(match[0], `
      <script type="text/javascript" src="${jsContent[idx]}"></script>
    `);
  });

  let injectedBaseStyle = false;
  const cssBaseStyle = `<style>body{font-family: sans-serif;}</style>`;
  const cssRegex = /<link.*href=["'`](.+\.css)["'`].*>/g;
  const cssMatches = Array.from(content.matchAll(cssRegex) || []);
  const cssContent: { [idx: number]: string } = {};
  await Promise.all(cssMatches.map((match, idx) => {
    return webR.FS.readFile(`${root}/${match[1]}`)
      .then((file) => bufferToBase64(file))
      .then((enc) => {
        cssContent[idx] = "data:text/css;base64," + enc;
      });
  }));
  cssMatches.forEach((match, idx) => {
    let cssHtml = `<link rel="stylesheet" href="${cssContent[idx]}"/>`;
    if (!injectedBaseStyle) {
      cssHtml = cssBaseStyle + cssHtml;
      injectedBaseStyle = true;
    }
    content = content.replace(match[0], cssHtml);
  });

  filesInterface.openHtmlInEditor(content, url);
}

function handleViewMessage(msg: ViewMessage) {
  const { title, data } = msg.data;
  filesInterface.openDataInEditor(title, data);
}

const onPanelResize = (size: number) => {
  void webR.init().then(() => {
    plotInterface.resize("width", size * window.innerWidth / 100);
  });
};

// Select which panes to show
const appMode = urlParams.get("mode") || "editor-plot-terminal-files";
let hideEditor = !appMode.includes('editor');
let hideTerminal = !appMode.includes('terminal');
let hideFiles = !appMode.includes('files');
let hidePlot = !appMode.includes('plot');
if (hideEditor && hideTerminal && hideFiles && hidePlot) {
  hideEditor = hideTerminal = hideFiles = hidePlot = false;
}

function App() {
  const rightPanelRef = React.useRef<ImperativePanelHandle | null>(null);

  async function applyShareData(items: ShareItem[]): Promise<void> {
    // Write files to VFS
    await webR.init();
    await Promise.all(items.map(async (item) => {
      return webR.FS.writeFile(item.path, item.data ? item.data : encoder.encode(item.text));
    }));

    // Load saved files into editor
    await startup.promise;
    void filesInterface.refreshFilesystem();
    void filesInterface.openFilesInEditor(items.map((item) => ({
      name: item.name,
      path: item.path,
      execute: item.autorun,
      forceRead: true,
    })), true);
  }

  function applyShareHash(hash: string): void {
    const shareHash = hash.match(/(code)=([^&]+)(?:&(\w+))?/);
    if (shareHash && shareHash[1] === 'code') {
      const items = decodeShareData(shareHash[2], shareHash[3]);

      // Load initial content into editor
      void filesInterface.openContentInEditor(items.map((item) => ({
        name: item.name,
        content: item.data ? item.data : encoder.encode(item.text)
      })), true);

      void applyShareData(items);
    }
  }

  React.useEffect(() => {
    window.addEventListener("resize", () => {
      if (!rightPanelRef.current) return;
      onPanelResize(rightPanelRef.current.getSize());
    });

    // Show share content whenever URL hash code changes
    window.addEventListener("hashchange", (event: HashChangeEvent) => {
      const url = new URL(event.newURL);
      applyShareHash(url.hash);
    });

    // Listen for messages containing shared files data. See `encodeShareData()` for details.
    window.addEventListener("message", (event: MessageEvent<{ items: EditorItem[] }>) => {
      const items = event.data.items;
      if (!isShareItems(items)) {
        throw new Error("Provided postMessage data does not contain a valid set of share files.");
      }
      void applyShareData(items);
    });
  }, []);

  // Set initial plot size
  React.useLayoutEffect(() => {
    if (!rightPanelRef.current) return;
    onPanelResize(rightPanelRef.current.getSize());
  }, []);

  // Show share content on initial load
  React.useEffect(() => {
    const url = new URL(window.location.href);
    applyShareHash(url.hash);
  }, []);

  const group1 = <>
    <Editor
      hidden={hideEditor}
      webR={webR}
      terminalInterface={terminalInterface}
      filesInterface={filesInterface}
    />
    <PanelResizeHandle hidden={hideEditor || hideTerminal} />
    <Terminal hidden={hideTerminal} webR={webR} terminalInterface={terminalInterface} />
  </>;

  const group2 = <>
    <Files hidden={hideFiles} webR={webR} filesInterface={filesInterface} />
    <PanelResizeHandle hidden={hideFiles || hidePlot} />
    <Plot hidden={hidePlot} maximize={hideFiles} webR={webR} plotInterface={plotInterface}/>
  </>;

  return (
    <div className='repl'>
      <PanelGroup direction="horizontal">
        {(hideFiles && hidePlot) ? group1 : <>
          <Panel defaultSize={50} minSize={10}>
            <PanelGroup autoSaveId="conditional" direction="vertical">
              {group1}
            </PanelGroup>
          </Panel>
          <PanelResizeHandle />
          <Panel ref={rightPanelRef} onResize={onPanelResize} minSize={10}>
            <PanelGroup direction="vertical">
              {group2}
            </PanelGroup>
          </Panel>
        </>}
      </PanelGroup>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<StrictMode><App /></StrictMode>);

void (async () => {
  await webR.init();

  // Set the default graphics device, browser, and pager
  await webR.evalRVoid('webr::viewer_install()');
  await webR.evalRVoid('webr::pager_install()');
  await webR.evalRVoid(`
    webr::canvas_install(
      width = getOption("webr.fig.width", 504),
      height = getOption("webr.fig.height", 504)
    )
  `);

  // shim function from base R with implementations for webR
  // see ?webr::shim_install for details.
  await webR.evalRVoid('webr::shim_install()');

  // If supported, show a menu when prompted for missing package installation
  const showMenu = crossOriginIsolated && !hideTerminal;
  await webR.evalRVoid('options(webr.show_menu = show_menu)', { env: { show_menu: !!showMenu } });
  await webR.evalRVoid('webr::global_prompt_install()', { withHandlers: false });

  // Additional options for running packages under wasm
  await webR.evalRVoid('options(rgl.printRglwidget = TRUE)');

  // Clear the loading message
  terminalInterface.write('\x1b[2K\r');

  startup.resolve();
  for (; ;) {
    const output = await webR.read();
    switch (output.type) {
      case 'stdout':
        terminalInterface.println(output.data as string);
        break;
      case 'stderr':
        terminalInterface.println(`\x1b[1;31m${output.data as string}\x1b[m`);
        break;
      case 'prompt':
        void filesInterface.refreshFilesystem();
        terminalInterface.read(output.data as string).then((command) => {
          webR.writeConsole(command);
        }, (reason) => {
          console.error(reason);
          throw new Error(`An error occurred reading from the R console terminal.`);
        });
        break;
      case 'canvas':
        handleCanvasMessage(output as CanvasMessage);
        break;
      case 'pager':
        await handlePagerMessage(output as PagerMessage);
        break;
      case 'view':
        handleViewMessage(output as ViewMessage);
        break;
      case 'browse':
        void handleBrowseMessage(output as BrowseMessage);
        break;
      case 'closed':
        throw new Error('The webR communication channel has been closed');
      default:
        console.error(`Unimplemented output type: ${output.type}`);
        console.error(output.data);
    }
  }
})();
