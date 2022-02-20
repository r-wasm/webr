function loadWebR(options){
	if(options.loadPackages === undefined) options.loadPackages=[];
	if(options.WEBR_URL === undefined) options.WEBR_URL = "https://cdn.jsdelivr.net/gh/georgestagg/webR/dist/";
	if(options.PKG_URL === undefined) options.PKG_URL = "https://cdn.jsdelivr.net/gh/georgestagg/webr-ports/dist/";
	var webR = {
		runRAsync: async function(code){
			var reg = /(library|require)\(['"]?(.*?)['"]?\)/g;
			var res;
			var packages = [];
			const builtin_packages = ['base', 'compiler', 'datasets', 'grDevices', 'graphics', 'grid', 'methods', 'parallel', 'splines',
				'stats', 'stats4', 'tcltk', 'tools', 'translations', 'utils'];
			while((res = reg.exec(code)) !== null) {
				if(!builtin_packages.includes(res[2])){
					packages.push(res[2]);
				}
			}
			try {
				await packages.reduce(function(cur, next) {
					return cur.then(_ => webR.loadPackage(next));
				}, Promise.resolve());
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
		loadedPackages: [],
		loadPackage: function(package_name){
			return new Promise(function (resolve, reject) {
				if (this.loadedPackages.includes(package_name)){
					resolve();
				} else {
					console.log("Loading webR package " + package_name);
					this.loadedPackages.push(package_name);
					window.Module['locateFile'] = function(path, prefix) {
						return options.PKG_URL + package_name + "/" + path;
					}
					var script = document.createElement('script');
					script.setAttribute('src',options.PKG_URL + package_name + "/" + package_name + ".js");
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
		}
	}
	return new Promise((resolve, reject) => {
		window.Module = {
			preRun: [function(){ENV.R_HOME="/usr/lib/R"; ENV.R_ENABLE_JIT="0"}],
			postRun: [],
			arguments: ['-q'],
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
			canvas: (function() {
			})(),
			setStatus: function(text) {
				if (!window.Module.setStatus.last) window.Module.setStatus.last = { time: Date.now(), text: '' };
				if (text === window.Module.setStatus.last.text) return;
			},
			onRuntimeInitialized: function(){
				options.loadPackages.reduce(function(cur, next) {
					return cur.then(_ => webR.loadPackage(next));
				}, Promise.resolve()).then(_ => resolve(webR));
			},
			totalDependencies: 0,
			_monitorRunDependencies: function(left) {
				this.totalDependencies = Math.max(this.totalDependencies, left);
				window.Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
			},
			monitorRunDependencies: left => window.Module._monitorRunDependencies(left)
		};
		window.Module.setStatus('Downloading...');
		var script = document.createElement('script');
		script.setAttribute('src',options.WEBR_URL+'R.bin.js');
		document.head.appendChild(script);
	});
}
