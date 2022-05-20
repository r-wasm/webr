const esbuild = require('esbuild');
const cssModulesPlugin = require('esbuild-css-modules-plugin');

function build({ input, output, format, minify }) {
  esbuild.build({
    entryPoints: [`${input}`],
    bundle: true,
    target: ['es2020','node12'],
    minify: minify,
    sourcemap: true,
    outfile: `../dist/${output}`,
    logLevel: 'info',
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
    input: "webR/webR.js",
    output: "../dist/webR.js",
    format: "umd",
    minify: true,
  },
  {
    input: "repl/repl.ts",
    output: "../dist/repl.js",
    format: "umd",
    minify: true,
  },
  {
    input: "console/console.ts",
    output: "../dist/console.js",
    format: "umd",
    minify: true,
  },
].map(build);