import { BASE_URL, PKG_BASE_URL } from './config';
import { AsyncQueue } from './queue';
import { IN_NODE, loadScript } from './compat';

interface Module {
  _run_R_from_JS: (code: number, length: number) => Promise<string>;
  _EM_ReplRead: (code: number, length: number) => Promise;
}

export interface WebRAPIInterface extends Module {
  FS: FS;
  ENV: { [key: string]: string };
  preRun: (() => void)[];
  isLoaded: (pkg) => boolean;
  loadPackages: (packages: string[]) => Promise;
  runRAsync: (code: number) => Promise<string>;
  readInput: (code: string) => Promise;
  readOutput: () => Promise<WebROutput>;
  putFileData: (name, data) => Promise;
  getFileData: (name: string) => Promise<Uint8Array>;
}

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

const preReqPackages: { [key: string]: string } = {
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

const outputQueue = new AsyncQueue();
const loadedPackages = [];

export async function loadWebR(
  options: {
    RArgs?: string[];
    REnv?: { [key: string]: string };
    WEBR_URL?: string;
    PKG_URL?: string;
    homedir?: string;
  } = {}
): Promise<WebRAPIInterface> {
  const config = Object.assign(defaultOptions, options);

  globalThis.Module = {};
  const Module = globalThis.Module as WebRAPIInterface;
  Module.preRun = [];
  Module.arguments = config.RArgs;
  Module.noExitRuntime = true;

  Module.preRun.push(() => {
    Module.FS.mkdirTree(config.homedir);
    Module.ENV.HOME = config.homedir;
    Module.FS.chdir(config.homedir);
    Module.ENV = Object.assign(Module.ENV, config.REnv);
  });

  const initialised = new Promise((r) => (Module.postRun = r));
  Module.locateFile = (path: string) => config.WEBR_URL + path;

  Module.runRAsync = async function (code: string): Promise<string> {
    return await Module._run_R_from_JS(allocate(intArrayFromString(code), 0), code.length);
  };

  Module.readInput = async function (code: string): Promise {
    await Module._EM_ReplRead(allocate(intArrayFromString(code), 0), code.length);
  };

  Module.getFileData = async function (name: string): Uint8Array {
    await initialised;
    const FS = Module.FS;
    const size = FS.stat(name).size;
    const stream = FS.open(name, 'r');
    const buf = new Uint8Array(size);
    FS.read(stream, buf, 0, size, 0);
    FS.close(stream);
    return buf;
  };

  Module.loadPackages = async function (packages: string[]): Promise {
    await initialised;
    for (const pkg of packages) {
      if (Module.isLoaded(pkg)) {
        continue;
      }
      outputQueue.put({ type: 'packageLoading', text: pkg });

      const deps = preReqPackages[pkg];
      if (deps) {
        await Module.loadPackages(deps);
      }

      loadedPackages.push(pkg);

      Module['locateFile'] = (path: string) => config.PKG_URL + pkg + '/' + path;
      const src = config.PKG_URL + pkg + '/' + pkg + '.js';
      await loadScript(src);

      await new Promise((resolve) => {
        Module.monitorRunDependencies = (n) => {
          if (n === 0) resolve();
        };
      });
    }
  };

  Module.isLoaded = function (pkg: string): boolean {
    return loadedPackages.includes(pkg) || builtinPackages.includes(pkg);
  };

  Module.readOutput = async function (): Promise<WebROutput> {
    return await outputQueue.get();
  };

  Module.putFileData = async function (name, data): Promise {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, new-cap
    await Module.FS_createDataFile('/', name, data, true, true, true);
  };

  Module.print = (text: string) => {
    outputQueue.put({ type: 'stdout', text: text });
  };

  Module.printErr = (text: string) => {
    outputQueue.put({ type: 'stderr', text: text });
  };

  Module.setPromptCallback = (prompt: string) => {
    outputQueue.put({ type: 'prompt', text: prompt });
  };

  const scriptSrc = `${config.WEBR_URL}R.bin.js`;
  await loadScript(scriptSrc);

  await initialised;
  return Module;
}
