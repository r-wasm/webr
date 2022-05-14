const pkg = process.argv[2];
if (!pkg) {
    throw "Please provide a package to test as an argument";
}

async function run () {
    process.argv.splice(1, 2);
    require(`../../dist/webR_node.js`);
    await webR.runRCode(
        `tools::testInstalledPackage('${pkg}', srcdir='/usr/lib/R/tests/Examples')`
    );
}
run();
