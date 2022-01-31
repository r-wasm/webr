var WEBR_URL = "https://cdn.jsdelivr.net/gh/georgestagg/webR/dist/";
function loadWebR(options){
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
	  }
	}
	return new Promise((resolve, reject) => {
	window.Module = {
        preRun: [function(){ENV.R_HOME="/usr/lib/R"}],
        postRun: [],
        arguments: ['-q'],
		noExitRuntime: true,
		locateFile: function(path, prefix) {
			return( WEBR_URL + path);
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
		onRuntimeInitialized: function(){resolve(webR)},
        totalDependencies: 0,
        monitorRunDependencies: function(left) {
          this.totalDependencies = Math.max(this.totalDependencies, left);
          window.Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
        }
      };
      window.Module.setStatus('Downloading...');
      var script = document.createElement('script');
      script.setAttribute('src',WEBR_URL+'R.bin.js');
      document.head.appendChild(script);
	});
}
