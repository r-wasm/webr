function loadWebR(options){
	if(options.loadPackages === undefined) options.loadPackages=[];
	if(options.WEBR_URL === undefined) options.WEBR_URL = "https://cdn.jsdelivr.net/gh/georgestagg/webR/dist/";
	if(options.PKG_URL === undefined) options.PKG_URL = "https://cdn.jsdelivr.net/gh/georgestagg/webr-ports/dist/";
	var webR = {
		runRAsync: async function(code){
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
		loadPackage: function(package_name){
			return new Promise(function (resolve, reject) {
				console.log("Loading webR package " + package_name)
				window.Module['locateFile'] = function(path, prefix) {
					return options.PKG_URL + package_name + "/" + path;
				}
				var script = document.createElement('script');
				script.setAttribute('src',options.PKG_URL + package_name + "/" + package_name + ".js");
				script.onload = resolve;
				script.onerror = reject;
				document.head.appendChild(script);
			});
		}
	}
	return new Promise((resolve, reject) => {
		window.Module = {
			preRun: [function(){ENV.R_HOME="/usr/lib/R"}],
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
					return cur.then(webR.loadPackage(next));
				}, Promise.resolve()).then(function() {
					resolve(webR);
				});
			},
			totalDependencies: 0,
			monitorRunDependencies: function(left) {
				this.totalDependencies = Math.max(this.totalDependencies, left);
				window.Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
			}
		};
		window.Module.setStatus('Downloading...');
		var script = document.createElement('script');
		script.setAttribute('src',options.WEBR_URL+'R.bin.js');
		document.head.appendChild(script);
	});
}
