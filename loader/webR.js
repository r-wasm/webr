function loadWebR(options){
    if(options.packages === undefined) options.packages = [];
    if(options.Rargs === undefined) options.Rargs = ['-q'];
    if(options.runtimeInitializedCB === undefined) options.runtimeInitializedCB = function(){};
    if(options.loadingPackageCB === undefined) options.loadingPackageCB = function(packageName){ console.log("Loading webR package " + packageName) };
    if(options.WEBR_URL === undefined) options.WEBR_URL = "@@BASE_URL@@";
    if(options.PKG_URL === undefined) options.PKG_URL = "https://cdn.jsdelivr.net/gh/georgestagg/webr-ports/dist/";
    if(options.ENV === undefined) options.ENV = {
        "R_NSIZE"      : "1000000",
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
            'Matrix': ['lattice'],
            'mgcv': ['nlme', 'Matrix'],
            'munsell': ['colorspace'],
            'nlme': ['lattice'],
            'pillar': ['cli', 'crayon', 'ellipsis', 'fansi', 'glue', 'lifecycle', 'rlang', 'utf8', 'vctrs'],
            'purrr': ['magrittr', 'rlang'],
            'readr': ['cli', 'clipr', 'crayon', 'hms', 'lifecycle', 'R6', 'rlang', 'tibble', 'vroom'],
            'stringr': ['glue', 'magrittr', 'stringi'],
            'tibble': ['ellipsis', 'fansi', 'lifecycle', 'magrittr', 'pillar', 'pkgconfig', 'rlang', 'vctrs'],
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
        loadedPackages: [],
        loadPackages: function(packages){
            return packages.reduce(function(curPromise, packageName) {
                return curPromise.then(_ => {
                    var nextPromise = new Promise(function (resolve, reject) {
                        if (this.loadedPackages.includes(packageName)){
                            resolve();
                        } else if (this.builtinPackages.includes(packageName)){
                            resolve();
                        } else {
                            options.loadingPackageCB(packageName);
                            this.loadedPackages.push(packageName);
                            window.Module['locateFile'] = function(path, prefix) {
                                return options.PKG_URL + packageName + "/" + path;
                            }
                            var script = document.createElement('script');
                            script.setAttribute('src', options.PKG_URL + packageName + "/" + packageName + ".js");
                            script.onerror = reject;
                            window.Module.monitorRunDependencies = function(left) {
                                window.Module._monitorRunDependencies(left);
                                if(left == 0){
                                    monitorRunDependencies = left => window.Module._monitorRunDependencies(left);
                                    resolve();
                                }
                            };
                            document.head.appendChild(script);
                        }
                    }.bind(this));
                    var prereq = (packageName in this.preReqPackages)?this.preReqPackages[packageName]:[];
                    return nextPromise.then(_ => this.loadPackages(prereq));
                });
            }.bind(this), Promise.resolve());
        }
    }
    return new Promise((resolve, reject) => {
        window.Module = {
            preRun: [function(){ENV = options.ENV}],
            postRun: [],
            arguments: options.Rargs,
            noExitRuntime: true,
            locateFile: function(path, prefix) {
                return( options.WEBR_URL + path);
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
            onRuntimeInitialized: function(){
                options.runtimeInitializedCB();
                webR.loadPackages(options.packages).then(_ => resolve(webR));
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
        var script = document.createElement('script');
        script.setAttribute('src',options.WEBR_URL+'R.bin.js');
        document.head.appendChild(script);
    });
}
