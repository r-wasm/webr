import { WebR } from '../webR/webR';

var term = $('#term').terminal([], {
    prompt: '',
    greetings: false,
    history: true
});

window.FSTree = {
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
    cbNodeJSON: function() {
        return async function(obj, cb) {
            let json;
            if (obj.id === '#'){
                json = await webR.getFileNode();
                json['parent'] = '#';
                json['state']['selected'] = true;
            }
            cb.call(this, json);
        };
    },
};

// Should be exposed as an interface from webR.ts
class WebRFrontend {
    async readInput(prompt) {
        let textProm = term.read(prompt);
        term.history().enable();

        let text = await textProm;

        const reg = /(library|require)\(['"]?(.*?)['"]?\)/g;
        let res, packages = [];
        while ((res = reg.exec(text)) !== null) {
            packages.push(res[2]);
        }

        try {
            await webR.loadPackages(packages);
        } catch(err) {
            console.log("An error occured loading one or more packages. Perhaps they do not exist in webR-ports.");
            console.log(err);
        }

        return text;
    };
}

const worker = new Worker('webR.js');
const webR = Comlink.wrap(worker);

const webRFrontend = new WebRFrontend();
Comlink.expose(webRFrontend, worker);

(async () => {
    term.echo("R is downloading, please wait...");

    await webR.init({
        RArgs: [],
        REnv: {
            R_NSIZE: "3000000",
            R_VSIZE: "64M",
            R_HOME: "/usr/lib/R",
            R_ENABLE_JIT: "0",
            R_DEFAULT_DEVICE: "canvas",
            COLORTERM: "truecolor"
        }
    });
    FSTree.init();

    while (true) {
        let output = await webR.readOutput();

        switch (output.type) {
        case 'stdout':
            term.echo(output.text, { exec: false });
            break;
        case 'stderr':
            term.error(output.text);
            break;
        case 'packageLoading':
            term.echo("Downloading webR package: " + output.text);
            break;
        }

        FSTree.jstree.refresh();
    }
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
