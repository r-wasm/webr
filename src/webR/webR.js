import { BASE_URL, PKG_BASE_URL } from './config';
import { AsyncQueue } from './queue';
import * as Comlink from 'comlink';

const builtinPackages = [
    'base', 'compiler', 'datasets', 'grDevices', 'graphics', 'grid', 'methods', 'parallel',
    'splines', 'stats', 'stats4', 'tcltk', 'tools', 'translations', 'utils'
];

const preReqPackages = {
    'dplyr': [ 'generics', 'glue', 'lifecycle', 'magrittr', 'pillar', 'R6', 'rlang', 'tibble', 'tidyselect', 'vctrs'],
    'ellipsis': ['rlang'],
    'ggplot2': ['digest', 'glue', 'gtable', 'isoband', 'MASS', 'mgcv', 'rlang', 'scales', 'tibble', 'withr'],
    'lifecycle': ['rlang', 'glue'],
    'lubridate': ['generics'],
    'mario': ['base64enc', 'crayon', 'ggplot2', 'jsonlite', 'pryr', 'readr', 'dplyr'],
    'Matrix': ['lattice'],
    'mgcv': ['nlme', 'Matrix'],
    'munsell': ['colorspace'],
    'nlme': ['lattice'],
    'pillar': ['cli', 'crayon', 'ellipsis', 'fansi', 'glue', 'lifecycle', 'rlang', 'utf8', 'vctrs'],
    'pryr': ['codetools', 'Rcpp', 'stringr'],
    'purrr': ['magrittr', 'rlang'],
    'readr': ['cli', 'clipr', 'crayon', 'hms', 'lifecycle', 'R6', 'rlang', 'tibble', 'vroom'],
    'stringr': ['glue', 'magrittr', 'stringi'],
    'tibble': ['ellipsis', 'fansi', 'lifecycle', 'magrittr', 'pillar', 'pkgconfig', 'rlang', 'vctrs'],
    'tidyr': ['dplyr', 'rlang', 'vctrs'],
    'tidyselect': ['ellipsis', 'glue', 'purrr', 'rlang', 'vctrs'],
    'scales': ['farver', 'labeling', 'lifecycle', 'munsell', 'R6', 'RColorBrewer', 'viridisLite'],
    'vctrs': ['ellipsis', 'glue', 'rlang'],
    'vroom': ['bit64', 'crayon', 'cli', 'glue', 'hms', 'lifecycle', 'rlang', 'tibble', 'tzdb', 'vctrs', 'tidyselect', 'withr'],
};

const defaultArgs = ['-q']

const defaultEnv = {
    R_NSIZE: "3000000",
    R_VSIZE: "64M",
    R_HOME: "/usr/lib/R",
    R_ENABLE_JIT: "0"
}

export class WebR {
    PKG_URL;
    #initialised;

    async init({RArgs = defaultArgs,
                REnv = defaultEnv,
                WEBR_URL = BASE_URL,
                PKG_URL = PKG_BASE_URL}) {
        this.PKG_URL = PKG_URL;

        let queue = this.#outputQueue;
        let webR = this;

        webR.#initialised = new Promise((resolve, _reject) => {
            self.Module = {
                preRun: [function() { self.ENV = REnv }],
                postRun: [],
                arguments: RArgs,
                noExitRuntime: true,
                locateFile: function(path, _prefix) {
                    return(WEBR_URL + path);
                },
                print: function(text) {
                    queue.put({ type: 'stdout', text: text });
                },
                printErr: function(text) {
                    if (arguments.length > 1) {
                        text = Array.prototype.slice.call(arguments).join(' ');
                    }
                    queue.put({ type: 'stderr', text: text });
                },
                canvas: (function() {})(),
                setStatus: function(_text) {
                    if (!self.Module.setStatus.last) {
                        self.Module.setStatus.last = { time: Date.now(), text: '' };
                    }
                },
                onRuntimeInitialized: function() {
                    resolve(webR);
                },
                totalDependencies: 0,
                _monitorRunDependencies: function(left) {
                    this.totalDependencies = Math.max(this.totalDependencies, left);
                    self.Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' +
                                            this.totalDependencies + ')' : 'All downloads complete.');
                },
                monitorRunDependencies: left => window.Module._monitorRunDependencies(left),
                setPromptCallback: function(prompt) {
                    queue.put({ type: 'prompt', text: prompt });
                },
            };
            self.Module.setStatus('Downloading...');
            importScripts(WEBR_URL + 'R.bin.js');
        });

        return await this.#initialised;
    }

    async runRAsync(code) {
        return(window.Module._run_R_from_JS(allocate(intArrayFromString(code), 0), code.length));
    }

    async readInput(code) {
        return(window.Module._EM_ReplRead(allocate(intArrayFromString(code), 0), code.length));
    }

    async getFileData(name) {
        await this.#initialised;

        let FS = self.FS;
        let size = FS.stat(name).size;
        let stream = FS.open(name, 'r');
        let buf = new Uint8Array(size);
        FS.read(stream, buf, 0, size, 0);
        FS.close(stream);
        return buf;
    }

    async getFileNode() {
        await this.#initialised;

        let node = FS.open("/").node;
        return this.#getNodeJSON(node);
    }

    #getNodeJSON(node) {
        if (node.isFolder) {
            let info = {
                'text': node.name,
                'children': Object.entries(node.contents).map(
                    ([_k, v], _i) => this.#getNodeJSON(v)
                )
            };
            if (['/'].includes(node.name)) {
                info['state'] = {'opened': true};
            }
            return info;
        }
        // FIXME: Shouldn't mention JStree here
        return {'text': node.name, 'icon': 'jstree-file'};
    }

    async putFileData(name, data) {
        self.Module['FS_createDataFile']('/', name, data, true, true, true);
    }

    #loadedPackages = [];

    async loadPackages(packages) {
        await this.#initialised;

        for (const pkg of packages) {
            if (this.isLoaded(pkg)) {
                continue;
            }
            this.#outputQueue.put({ type: 'packageLoading', text: pkg });

            let deps = preReqPackages[pkg];
            if (deps) {
                await this.loadPackages(deps);
            }

            this.#loadedPackages.push(pkg);
            await loadPackageUrl(this.PKG_URL, pkg);
        }
    }

    isLoaded(pkg) {
        return this.#loadedPackages.includes(pkg) || builtinPackages.includes(pkg);
    }


    #outputQueue = new AsyncQueue();

    async readOutput() {
        return await this.#outputQueue.get();
    }
}

async function loadScript(src) {
  return new Promise(function (resolve, reject) {
    let script = document.createElement('script');

    script.src = src;
    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
}

async function loadPackageUrl(baseUrl, pkg) {
    return new Promise(function (resolve) {
        const oldLocateFile = self.Module['locateFile'];
        const oldMonitorRunDependencies = self.Module['monitorRunDependencies'];

        let reset = function() {
            self.Module['monitorRunDependencies'] = oldMonitorRunDependencies;
            self.Module['locateFile'] = oldLocateFile;
        }

        const pkgBaseUrl = baseUrl + pkg;
        self.Module['locateFile'] = function(path, _prefix) { return pkgBaseUrl + "/" + path; }

        self.Module['monitorRunDependencies'] = function(left) {
            self.Module['_monitorRunDependencies'](left);
            if (left == 0) {
                reset();
                resolve();
            }
        };

        const pkgUrl = pkgBaseUrl + '/' + pkg + '.js';
        importScripts(pkgUrl);
    });
}
