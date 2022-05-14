const fs = require('fs/promises');
const { Worker } = require('node:worker_threads');

globalThis.Worker = Worker;

const sourceFile = process.argv[2];
if (!sourceFile) {
    throw "Please provide an R source file to run as an argument";
}

(async () => {
    let args = process.argv;
    args.splice(0, 3);
    const { WebR } = require(`../dist/webR.js`);
    const webR = new WebR({
        RArgs: args,
      });
    await webR.init();
    const code = await fs.readFile(`${sourceFile}`, { encoding: 'utf8' });
    webR.writeConsole(code);
    for (;;) {
      const output = await webR.read();
      if (output.type === 'stdout') {
        console.log(output.data);
      } else if (output.type === 'stderr') {
        console.error(output.data);
      }
    }
})();
