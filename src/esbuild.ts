const esbuild = require('esbuild');
const cssModulesPlugin = require('esbuild-css-modules-plugin');

function build({ input, output, platform, minify }) {
  esbuild.build({
    entryPoints: [`${input}`],
    bundle: true,
    target: ['es2020','node12'],
    minify: minify,
    sourcemap: true,
    outfile: output,
    logLevel: 'info',
    platform: platform,
    mainFields: ['main', 'module'],
    external: ['worker_threads', 'path', 'fs'],
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

const outputs = {
  'console.mjs': {
    input: "console/console.ts",
    platform: 'neutral',
    minify: true,
  },
  'repl.mjs': {
    input: "repl/repl.ts",
    platform: 'neutral',
    minify: true,
  },
  'webr-worker.js': {
    input: "webR/webr-worker.ts",
    platform: 'node',
    minify: false,
  },
  'webr-serviceworker.js': {
    input: "webR/chan/serviceworker.ts",
    platform: 'browser',
    minify: false,
  },
  'webr-serviceworker.mjs': {
    input: "webR/chan/serviceworker.ts",
    platform: 'neutral',
    minify: false,
  },
  'webr.mjs': {
    input: "webR/webr-main.ts",
    platform: 'neutral',
    minify: true,
  },
  'webr.cjs': {
    input: "webR/webr-main.ts",
    platform: 'node',
    minify: true,
  },
};

// Build for web release package
[
  'console.mjs',
  'repl.mjs',
  'webr-serviceworker.js',
  'webr-worker.js',
  'webr.mjs'
].map( (outfile) => {
  build(Object.assign(outputs[outfile], { output: `../dist/${outfile}`}))
});

// Build for npm release package
[
  'webr-serviceworker.mjs',
  'webr-serviceworker.js',
  'webr-worker.js',
  'webr.cjs',
  'webr.mjs'
].map( (outfile) => {
  build(Object.assign(outputs[outfile], { output: `./dist/${outfile}`}))
});
