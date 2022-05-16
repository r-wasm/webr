import { newWebR } from './webR.js';

var term = $('#term').terminal([], {
    prompt: '',
    greetings: false,
    history: true
});

term.echo("R is downloading, please wait...");


// XHR proxy that handle methods from fetch in C
var re = /^___terminal::/;

window.XMLHttpRequest = (function(xhr) {
    return function() {
        var url;
        var props = {
            readyState: 4,
            status: 200
        };
        var enc = new TextEncoder("utf-8");
        return new Proxy(new xhr(), {
            get: function(target, name) {
                if (url && ['response', 'responseText', 'status', 'readyState'].indexOf(name) != -1) {
                    if (name == 'response') {
                        var response = enc.encode(props.responseText);
                        return response;
                    }
                    return props[name];
                } else if (name == 'open') {
                    return function(method, open_url) {
                        if (open_url.match(re)) {
                            url = open_url;
                        } else {
                            return target[name].apply(target, arguments);
                        }
                    };
                } else if (name == 'send') {
                    return function(data) {
                        if (url) {
                            var payload = url.split('::');
                            if (payload[1] == 'read') {
                                term.read(
                                    payload.length > 2 ? payload[2] : '',
                                    function(text) {
                                        const reg = /(library|require)\(['"]?(.*?)['"]?\)/g;
                                        let res, packages = [];
                                        while ((res = reg.exec(text)) !== null) {
                                            packages.push(res[2]);
                                        }

                                        (async () => {
                                            try {
                                                await webR.loadPackages(packages);
                                                props.responseText = text;
                                                target.onload();
                                                FSTree.jstree.refresh();
                                            } catch(err) {
                                                console.log("An error occured loading one or more packages. Perhaps they do not exist in webR-ports.");
                                                console.log(err);
                                                props.responseText = text;
                                                target.onload();
                                            }
                                        })();
                                    }
                                );
                                term.history().enable();
                            }
                        } else {
                            return target[name].apply(target, arguments);
                        }
                    };
                }
                return target[name];
            },
            set: function(target, name, value) {
                target[name] = value;
            }
        });
    };
})(window.XMLHttpRequest);

var FSTree = {
    jstree: null,
    init: function() {
        $('#jstree_fs').on('changed.jstree', function (e, data) {
            if (data.selected.length > 0){
                var node = this.jstree.get_node(data.selected[0]);
                if (node.icon == "jstree-file"){
                    $('#download-file').prop('disabled', false);
                    $('#upload-file').prop('disabled', true);
                } else {
                    $('#download-file').prop('disabled', true);
                    $('#upload-file').prop('disabled', false);
                }
            }
        }.bind(this)).jstree({
            "core" : {
                "check_callback" : true,
                "data" : this.cbNodeJSON(),
                "multiple": false,
            },
        });
        this.jstree = $('#jstree_fs').jstree();
    },
    getSelectedNode: function() {
        var nodes = this.jstree.get_selected(true);
        if (nodes.length > 0){
            return nodes[0];
        }
        return null;
    },
    getNodeFileName: function(node) {
        var parents = node.parents.map(nid => this.jstree.get_node(nid).text).reverse().slice(1);
        parents.push(node.text);
        parents[0]='';
        return parents.join('/');
    },
    downloadNodeasFile: async function(node) {
        let filepath = this.getNodeFileName(node);
        let data = await webR.getFileData(filepath);

        let filename = node.text;
        let blob = new Blob([data], { type: "application/octet-stream" });
        let url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        link.delete;
    },
    uploadFile: function(fileInput) {
        let node = this.getSelectedNode();
        let filepath = this.getNodeFileName(node);

        if (filepath === ''){
            filepath = '/';
        }
        if (fileInput.files.length == 0) {
            return;
        }

        let file = fileInput.files[0];
        let fr = new FileReader();

        let jstree = this.jstree;
        fr.onload = async function () {
            fileInput.value = '';
            var data = new Uint8Array(fr.result);
            await webR.putFileData(filepath + '/' + file.name, data);
            jstree.refresh()
        };

        fr.readAsArrayBuffer(file);
    },
    getNodeJSON: function(node) {
        if (node.isFolder){
            var info = {
                'text': node.name,
                'children':
                Object.entries(node.contents).map(
                    ([k, v], i) => this.getNodeJSON(v)
                )
            };
            if (['/'].includes(node.name)){
                info['state'] = {'opened': true};
            }
            return info;
        }
        return {'text': node.name, 'icon': 'jstree-file'};
    },
    cbNodeJSON: function() {
        var self = this;
        return function(obj, cb) {
            var json;
            if (obj.id === '#'){
                json = self.getNodeJSON(FS.open('/').node);
                json['parent'] = '#';
                json['state']['selected'] = true;
            }
            cb.call(this, json);
        };
    },
};

var webR = newWebR({
    Rargs: [],
    runtimeInitializedCB: function() {
        FSTree.init();
    },
    loadingPackageCB: function(packageName) {
        term.echo("Downloading webR package: " + packageName);
    },
    ENV: {
        R_NSIZE: "3000000",
        R_VSIZE: "64M",
        R_HOME: "/usr/lib/R",
        R_ENABLE_JIT: "0",
        R_DEFAULT_DEVICE: "canvas",
        COLORTERM: "truecolor",
    },
    stdout: function(text) {
        term.echo(text, {exec: false});
    },
    stderr: function(text) {
        if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
        term.error(text);
    },
});

(async () => {
    await webR.init();
    FSTree.init();
})();

const download = document.getElementById('download-file');
download.addEventListener('click', function(e) {
    FSTree.downloadNodeasFile(FSTree.getSelectedNode());
});
const plotsave = document.getElementById('plot-save');
plotsave.addEventListener('click', function(e) {
    const link = document.createElement('a');
    link.download = 'plot.png';
    link.href = document.getElementById('plot-canvas').toDataURL();
    link.click();
    link.delete;
});
