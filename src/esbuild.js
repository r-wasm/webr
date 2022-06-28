const esbuild = require('esbuild');
const cssModulesPlugin = require('esbuild-css-modules-plugin');

function build({ input, output, minify }) {
  esbuild.build({
    entryPoints: [`${input}`],
    bundle: true,
    target: ['es2020','node12'],
    minify: minify,
    sourcemap: true,
    outfile: `../dist/${output}`,
    logLevel: 'info',
    platform: 'node',
    assetNames: 'assets/[name]-[hash]',
    loader: {
      '.jpg': 'file',
      '.png': 'file',
      '.gif': 'file',
    },
    plugins: [
    	cssModulesPlugin({
    		inject: (cssContent, digest) => `console.log("${cssContent}", "${digest}")`,
    	})
    ],
  }).catch(() => process.exit(1));
}

[
  {
    input: "webR/worker.ts",
    output: "webR.js",
    minify: false,
  },
  {
    input: "repl/repl.ts",
    output: "repl.js",
    minify: true,
  },
  {
    input: "console/console.ts",
    output: "console.js",
    minify: true,
  },
  {
    input: "node/node.ts",
    output: "webR_node.js",
    minify: true,
  },
].map(build);
