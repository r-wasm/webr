import esbuild from 'esbuild';
import cssModulesPlugin from 'esbuild-css-modules-plugin';
import http from 'http';

let serve = false;
let prod = false;

if (process.argv.some((x) => x === '--serve')) {
  serve = true;
}

if (process.argv.some((x) => x === '--prod')) {
  prod = true;
}

// Node modules are imported only conditionally in browser -- stub them out during bundling
const builtins = ['worker_threads', 'path', 'fs', 'ws', 'url', 'child_process', 'http', 'https', 'crypto'];
const builtinList = builtins.reduce((prev, val, index) => (index > 0 ? `${prev}|${val}` : val));
const builtinRegexp = new RegExp(`^(${builtinList})\\/?(.+)?`);
const blankImportPlugin = {
  name: 'blankImport',
  setup(build: esbuild.PluginBuild) {
    build.onResolve({ filter: builtinRegexp }, (args) => ({
      path: args.path,
      namespace: 'blankImport'
    }));
    build.onLoad({ filter: builtinRegexp, namespace: 'blankImport' }, async (args) => {
      const contents = JSON.stringify(
        Object.keys(await import(args.path) as object).reduce<object>((p, c) => ({ ...p, [c]: '' }), {})
      );
      return { contents, loader: 'json' };
    });
  }
};

function build(input: string, options: any) {
  return esbuild.context({
    assetNames: 'assets/[name]-[hash]',
    bundle: true,
    entryPoints: [input],
    external: options.platform === 'browser' ? [] : builtins,
    loader: {
      '.jpg': 'file',
      '.png': 'file',
      '.gif': 'file',
    },
    mainFields: ['main', 'module'],
    plugins: [
      cssModulesPlugin({
        inject: (cssContent, digest) => `console.log("${cssContent}", "${digest}")`,
      }),
      ...(options.platform === 'browser' ? [blankImportPlugin] : [])
    ],
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': prod ? '"production"' : '"development"',
    },
    ...options,
  });
}

const outputs = [
  // These browser outputs are built into `webr/dist` for direct CDN distribution
  // TODO: Consider building the main browser script as `webr.js`
  build('repl/App.tsx', { outfile: '../dist/repl.js', platform: 'browser', format: 'iife', target: ['es2022'], minify: prod }), // browser, script
  build('webR/webr-main.ts', { outfile: '../dist/webr.mjs', platform: 'browser', format: 'esm', target: ['es2022'], minify: prod }), // browser, script, type="module"
  build('webR/webr-worker.ts', { outfile: '../dist/webr-worker.js', platform: 'neutral', format: 'iife', minify: prod }), // neutral: browser & node, worker script
  // These node outputs are built into `webr/src/dist` for npm distribution
  // The browser's `main.mjs` is also copied to `webr/src/dist/webr.js` for web bundlers
  build('webR/webr-main.ts', { outfile: './dist/webr.cjs', platform: 'node', format: 'cjs', minify: prod }), // node, cjs
  build('webR/webr-main.ts', {  // node, esm
    outfile: './dist/webr.mjs',
    platform: 'node',
    format: 'esm',
    banner: {
      js: `import { createRequire } from 'module';
import { fileURLToPath as urlESMPluginFileURLToPath } from "url";
import { dirname as pathESMPluginDirname} from "path";
const require = createRequire(import.meta.url);
var __filename = urlESMPluginFileURLToPath(import.meta.url);
var __dirname = pathESMPluginDirname(urlESMPluginFileURLToPath(import.meta.url)); 
`
    },
    minify: prod
  }),
];

outputs.forEach((build) => {
  build
    .then(async (context) => {
      await context.rebuild();
      if (serve) await context.watch();
    })
    .catch((reason) => {
      console.error(reason);
      throw new Error('A problem occurred building webR distribution with esbuild');
    });
});

if (serve) {
  outputs[0]
    .then(async (context) => {
      await context.serve({ servedir: '../dist', port: 8001 }).then(() => {
        http
          .createServer((req, res) => {
            const { url, method, headers } = req;
            req.pipe(
              http.request(
                { hostname: '127.0.0.1', port: 8001, path: url, method, headers },
                (proxyRes) => {
                  res.writeHead(proxyRes.statusCode!, {
                    ...proxyRes.headers,
                    'cross-origin-opener-policy': 'same-origin',
                    'cross-origin-embedder-policy': 'credentialless',
                    'cross-origin-resource-policy': 'cross-origin',
                  });
                  proxyRes.pipe(res, { end: true });
                }
              ),
              { end: true }
            );
          })
          .listen(8000);
        console.log('Server listening on http://127.0.0.1:8000.');
      });
    })
    .catch((reason) => {
      console.error(reason);
      throw new Error('A problem occurred serving webR distribution with esbuild');
    });
} else {
  outputs.forEach(build => {
    build
      .then(async (context) => {
        await context.dispose();
      })
      .catch((reason) => {
        console.error(reason);
        throw new Error('A problem occurred running esbuild');
      });
  });
}
