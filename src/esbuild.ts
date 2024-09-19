import esbuild from 'esbuild';
import cssModulesPlugin from 'esbuild-css-modules-plugin';
import http from 'http';

let serve = false;
let prod = false;
let pkg = true;

if (process.argv.some((x) => x === '--serve')) {
  serve = true;
  pkg = false;
}

if (process.argv.some((x) => x === '--prod')) {
  prod = true;
}

function build(input: string, output: string, platform: esbuild.Platform, minify: boolean) {
  return esbuild.context({
    assetNames: 'assets/[name]-[hash]',
    bundle: true,
    entryPoints: [input],
    external: ['worker_threads', 'path', 'fs'],
    loader: {
      '.jpg': 'file',
      '.png': 'file',
      '.gif': 'file',
    },
    mainFields: ['main', 'module'],
    minify: minify,
    outfile: output,
    platform: platform,
    plugins: [
      cssModulesPlugin({
        inject: (cssContent, digest) => `console.log("${cssContent}", "${digest}")`,
      })
    ],
    sourcemap: true,
    target: ['es2020', 'node12'],
    define: {
      'process.env.NODE_ENV': prod ? '"production"' : '"development"',
    },
  });
}

const outputs = {
  browser: [
    build('repl/App.tsx', '../dist/repl.mjs', 'browser', prod),
    build('webR/chan/serviceworker.ts', '../dist/webr-serviceworker.js', 'browser', false),
    build('webR/webr-worker.ts', '../dist/webr-worker.js', 'node', true),
    build('webR/webr-main.ts', '../dist/webr.mjs', 'neutral', prod),
  ],
  npm: [
    build('webR/chan/serviceworker.ts', './dist/webr-serviceworker.mjs', 'neutral', false),
    build('webR/chan/serviceworker.ts', './dist/webr-serviceworker.js', 'browser', false),
    build('webR/webr-worker.ts', './dist/webr-worker.js', 'node', true),
    build('webR/webr-main.ts', './dist/webr.cjs', 'node', prod),
    build('webR/webr-main.ts', './dist/webr.mjs', 'neutral', prod),
  ]
};
const allOutputs = outputs.browser.concat(pkg ? outputs.npm : []);

allOutputs.forEach((build) => {
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
  outputs.browser[0]
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
  allOutputs.forEach(build => {
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
