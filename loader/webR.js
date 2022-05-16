function newWebR(options) {
    if(options.packages === undefined) options.packages = [];
    if(options.Rargs === undefined) options.Rargs = ['-q'];
    if(options.runtimeInitializedCB === undefined) options.runtimeInitializedCB = function(){};
    if(options.loadingPackageCB === undefined) options.loadingPackageCB = function(packageName){ console.log("Loading webR package " + packageName) };
    if(options.WEBR_URL === undefined) options.WEBR_URL = "@@BASE_URL@@";
    if(options.PKG_URL === undefined) options.PKG_URL = "https://cdn.jsdelivr.net/gh/georgestagg/webr-ports/dist/";
    if(options.ENV === undefined) options.ENV = {
        "R_NSIZE"      : "3000000",
        "R_VSIZE"      : "64M",
        "R_HOME"       : "/usr/lib/R",
        "R_ENABLE_JIT" : "0",
    }
    var webR = {
        builtinPackages: ['base', 'compiler', 'datasets', 'grDevices', 'graphics', 'grid', 'methods', 'parallel',
            'splines', 'stats', 'stats4', 'tcltk', 'tools', 'translations', 'utils'],
        preReqPackages: {
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
        },
        runRAsync: async function(code){
            var reg = /(library|require)\(['"]?(.*?)['"]?\)/g;
            var res;
            var packages = [];
            while((res = reg.exec(code)) !== null) {
                    packages.push(res[2]);
            }
            try {
                await webR.loadPackages(packages);
            } catch (e) {
                console.log("An error occured loading one or more packages. Perhaps they do not exist in webR-ports.");
            }
            return(window.Module._run_R_from_JS(allocate(intArrayFromString(code), 0), code.length));
        },
        getFileData: async function(name){
            await webR._initialised;

            var FS = window.FS;
            var size = FS.stat(name).size;
            var stream = FS.open(name, 'r');
            var buf = new Uint8Array(size);
            FS.read(stream, buf, 0, size, 0);
            FS.close(stream);
            return buf;
        },
        putFileData: async function(name, data){
            window.Module['FS_createDataFile']('/', name, data, true, true, true);
        },

        _loadedPackages: [],
        loadPackages: async function(packages) {
            await webR._initialised;

            for (const pkg of packages) {
                if (this.isLoaded(pkg)) {
                    continue;
                }
                options.loadingPackageCB(pkg);

                let deps = this.preReqPackages[pkg];
                if (deps) {
                    await this.loadPackages(deps);
                }

                this._loadedPackages.push(pkg);
                await loadPackageUrl(options.PKG_URL, pkg);
            }
        },

        isLoaded: function(pkg) {
            return this._loadedPackages.includes(pkg) || this.builtinPackages.includes(pkg);
        },

        _initialised: null,
        init: async function() {
            webR._initialised = new Promise((resolve, _reject) => {
                window.Module = {
                    preRun: [function() { ENV = options.ENV }],
                    postRun: [],
                    arguments: options.Rargs,
                    noExitRuntime: true,
                    locateFile: function(path, _prefix) {
                        return(options.WEBR_URL + path);
                    },
                    print: function(text){
                        options.stdout(text);
                    },
                    printErr: function(text) {
                        if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
                        options.stderr(text);
                    },
                    canvas: (function() {})(),
                    setStatus: function(text) {
                        if (!window.Module.setStatus.last) window.Module.setStatus.last = { time: Date.now(), text: '' };
                        if (text === window.Module.setStatus.last.text) return;
                    },
                    onRuntimeInitialized: function() {
                        resolve(webR);
                    },
                    totalDependencies: 0,
                    _monitorRunDependencies: function(left) {
                        this.totalDependencies = Math.max(this.totalDependencies, left);
                        window.Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' +
                                                this.totalDependencies + ')' : 'All downloads complete.');
                    },
                    monitorRunDependencies: left => window.Module._monitorRunDependencies(left)
                };
                window.Module.setStatus('Downloading...');
                loadScript(options.WEBR_URL + 'R.bin.js');

                return webR;
            });

            await webR._initialised;

            options.runtimeInitializedCB();
            webR.loadPackages(options.packages);
            return webR;
        }
    }

    return webR;
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
    return new Promise(function (resolve, reject) {
        const oldLocateFile = window.Module['locateFile'];
        const oldMonitorRunDependencies = window.Module['monitorRunDependencies'];

        let reset = function() {
            window.Module['monitorRunDependencies'] = oldMonitorRunDependencies;
            window.Module['locateFile'] = oldLocateFile;
        }

        const url = baseUrl + pkg;
        window.Module['locateFile'] = function(path, _prefix) { return url + "/" + path; }

        let script = document.createElement('script');
        script.src = url + '/' + pkg + '.js';
        script.onerror = reject;

        window.Module['monitorRunDependencies'] = function(left) {
            window.Module['_monitorRunDependencies'](left);
            if (left == 0) {
                reset();
                resolve();
            }
        };

        document.head.appendChild(script);
    });
}
