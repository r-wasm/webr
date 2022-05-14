const fs = require('fs/promises');

const sourceFile = process.argv[2];
if (!sourceFile) {
    throw "Please provide an R source file to run as an argument";
}

async function run () {
    process.argv.splice(1, 2);
    require(`../dist/webR_node.js`);
    const code = await fs.readFile(`${sourceFile}`, { encoding: 'utf8' });
    await webR.runRCode(code);
}
run();
