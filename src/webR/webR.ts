import { BASE_URL, PKG_BASE_URL } from './config';
import { AsyncQueue } from './queue';
import { loadScript } from './compat';

interface Module extends EmscriptenModule {
  FS: any;
  ENV: { [key: string]: string };
  monitorRunDependencies: (n: number) => void;
  noImageDecoding: boolean;
  noAudioDecoding: boolean;
  setPrompt: (prompt: string) => void;
  canvasExec: (op: string) => void;
  _runRCode: (code: number, length: number) => Promise<string>;
  _readInput: (code: number, length: number) => Promise<void>;
  allocate(slab: number[] | ArrayBufferView | number, allocator: number): number;
  intArrayFromString(stringy: string, dontAddNull?: boolean, length?: number): number[];
}

export interface WebRBackend {
  runRCode: typeof runRCode;
  readInput: typeof readInput;
  readOutput: typeof readOutput;
  putFileData: typeof putFileData;
  getFileData: typeof getFileData;
  loadPackages: typeof loadPackages;
  isLoaded: typeof isLoaded;
  init: typeof init;
  getFSNode: typeof getFSNode;
}

type WebRConfig = {
  RArgs: string[];
  REnv: { [key: string]: string };
  WEBR_URL: string;
  PKG_URL: string;
  homedir: string;
};

type WebROutput = {
  type: string;
  text: string;
};

const builtinPackages: string[] = [
  'base',
  'compiler',
  'datasets',
  'grDevices',
  'graphics',
  'grid',
  'methods',
  'parallel',
  'splines',
  'stats',
  'stats4',
  'tcltk',
  'tools',
  'translations',
  'utils',
];

const preReqPackages: { [key: string]: string[] } = {
  dplyr: [
    'generics',
    'glue',
    'lifecycle',
    'magrittr',
    'pillar',
    'R6',
    'rlang',
    'tibble',
    'tidyselect',
    'vctrs',
  ],
  ellipsis: ['rlang'],
  ggplot2: [
    'digest',
    'glue',
    'gtable',
    'isoband',
    'MASS',
    'mgcv',
    'rlang',
    'scales',
    'tibble',
    'withr',
  ],
  lifecycle: ['rlang', 'glue'],
  lubridate: ['generics'],
  mario: ['base64enc', 'crayon', 'ggplot2', 'jsonlite', 'pryr', 'readr', 'dplyr'],
  Matrix: ['lattice'],
  mgcv: ['nlme', 'Matrix'],
  munsell: ['colorspace'],
  nlme: ['lattice'],
  pillar: ['cli', 'crayon', 'ellipsis', 'fansi', 'glue', 'lifecycle', 'rlang', 'utf8', 'vctrs'],
  pryr: ['codetools', 'Rcpp', 'stringr'],
  purrr: ['magrittr', 'rlang'],
  readr: ['cli', 'clipr', 'crayon', 'hms', 'lifecycle', 'R6', 'rlang', 'tibble', 'vroom'],
  stringr: ['glue', 'magrittr', 'stringi'],
  tibble: ['ellipsis', 'fansi', 'lifecycle', 'magrittr', 'pillar', 'pkgconfig', 'rlang', 'vctrs'],
  tidyr: ['dplyr', 'rlang', 'vctrs'],
  tidyselect: ['ellipsis', 'glue', 'purrr', 'rlang', 'vctrs'],
  scales: ['farver', 'labeling', 'lifecycle', 'munsell', 'R6', 'RColorBrewer', 'viridisLite'],
  vctrs: ['ellipsis', 'glue', 'rlang'],
  vroom: [
    'bit64',
    'crayon',
    'cli',
    'glue',
    'hms',
    'lifecycle',
    'rlang',
    'tibble',
    'tzdb',
    'vctrs',
    'tidyselect',
    'withr',
  ],
};

const defaultEnv = {
  R_NSIZE: '3000000',
  R_VSIZE: '64M',
  R_HOME: '/usr/lib/R',
  R_ENABLE_JIT: '0',
};

const defaultOptions = {
  RArgs: [],
  REnv: defaultEnv,
  WEBR_URL: BASE_URL,
  PKG_URL: PKG_BASE_URL,
  homedir: '/home/web_user',
};

const Module = {} as Module;
const outputQueue = new AsyncQueue();
const loadedPackages: string[] = [];
let _config: WebRConfig;
let initialised: Promise<void>;

type FSNode = {
  id: number;
  name: string;
  mode: number;
  isFolder: boolean;
  contents: { [key: string]: FSNode };
};

export async function getFSNode(path: string): Promise<FSNode> {
  await initialised;
  const node = Module.FS.lookupPath(path).node;
  return copyFSNode(node);
}

function copyFSNode(obj: FSNode): FSNode {
  const retObj = {
    id: obj.id,
    name: obj.name,
    mode: obj.mode,
    isFolder: obj.isFolder,
    contents: {},
  };
  if (obj.isFolder) {
    retObj.contents = Object.entries(obj.contents).map(([, node]) => copyFSNode(node));
  }
  return retObj;
}

export async function runRCode(code: string): Promise<string> {
  await initialised;
  return await Module._runRCode(Module.allocate(Module.intArrayFromString(code), 0), code.length);
}

export async function readOutput(): Promise<WebROutput> {
  return (await outputQueue.get()) as WebROutput;
}

export async function readInput(code: string): Promise<void> {
  await initialised;
  await Module._readInput(Module.allocate(Module.intArrayFromString(code), 0), code.length);
}

export async function getFileData(name: string): Promise<Uint8Array> {
  await initialised;
  const FS = Module.FS;
  const size = FS.stat(name).size;
  const stream = FS.open(name, 'r');
  const buf = new Uint8Array(size);
  FS.read(stream, buf, 0, size, 0);
  FS.close(stream);
  return buf;
}

export async function loadPackages(packages: string[]): Promise<void> {
  await initialised;
  for (const pkg of packages) {
    if (await isLoaded(pkg)) {
      continue;
    }
    outputQueue.put({ type: 'packageLoading', text: pkg });

    const deps = preReqPackages[pkg];
    if (deps) {
      await loadPackages(deps);
    }

    loadedPackages.push(pkg);

    Module['locateFile'] = (path: string) => _config.PKG_URL + pkg + '/' + path;
    const src = _config.PKG_URL + pkg + '/' + pkg + '.js';
    await loadScript(src);

    await new Promise<void>((resolve) => {
      Module.monitorRunDependencies = (n) => {
        if (n === 0) resolve();
      };
    });
  }
}

export async function isLoaded(pkg: string): Promise<boolean> {
  await initialised;
  return loadedPackages.includes(pkg) || builtinPackages.includes(pkg);
}

export async function putFileData(name: string, data: Uint8Array): Promise<void> {
  await initialised;
  Module.FS.createDataFile('/', name, data, true, true, true);
}

export async function init(
  options: {
    RArgs?: string[];
    REnv?: { [key: string]: string };
    WEBR_URL?: string;
    PKG_URL?: string;
    homedir?: string;
  } = {}
): Promise<void> {
  _config = Object.assign(defaultOptions, options);

  Module.preRun = [];
  Module.postRun = [];
  Module.arguments = _config.RArgs;
  Module.noExitRuntime = true;
  Module.noImageDecoding = true;
  Module.noAudioDecoding = true;

  Module.preRun.push(() => {
    Module.FS.mkdirTree(_config.homedir);
    Module.ENV.HOME = _config.homedir;
    Module.FS.chdir(_config.homedir);
    Module.ENV = Object.assign(Module.ENV, _config.REnv);
  });

  initialised = new Promise<void>((r) => Module.postRun.push(r));
  Module.locateFile = (path: string) => _config.WEBR_URL + path;

  Module.print = (text: string) => {
    outputQueue.put({ type: 'stdout', text: text });
  };

  Module.printErr = (text: string) => {
    outputQueue.put({ type: 'stderr', text: text });
  };

  Module.setPrompt = (prompt: string) => {
    outputQueue.put({ type: 'prompt', text: prompt });
  };

  Module.canvasExec = (op: string) => {
    outputQueue.put({ type: 'canvasExec', text: op });
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (globalThis as any).Module = Module;

  const scriptSrc = `${_config.WEBR_URL}R.bin.js`;
  await loadScript(scriptSrc);

  await initialised;
}
