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

function build(input: string, output: string, platform: esbuild.Platform) {
  return esbuild.context({
    assetNames: 'assets/[name]-[hash]',
    bundle: true,
    entryPoints: [ input ],
    external: ['worker_threads', 'path', 'fs'],
    loader: {
      '.jpg': 'file',
      '.png': 'file',
      '.gif': 'file',
    },
    mainFields: ['main', 'module'],
    minify: prod,
    outfile: output,
    platform: platform,
    plugins: [
      cssModulesPlugin({
        inject: (cssContent, digest) => `console.log("${cssContent}", "${digest}")`,
      })
    ],
    sourcemap: true,
    target: ['es2020', 'node12'],
  });
}

const outputs = {
  browser: [
    build('repl/repl.ts', '../dist/repl.mjs', 'neutral'),
    build('webR/chan/serviceworker.ts', '../dist/webr-serviceworker.js', 'browser'),
    build('webR/webr-worker.ts', '../dist/webr-worker.js', 'node'),
    build('webR/webr-main.ts', '../dist/webr.mjs', 'neutral'),
  ],
  npm: [
    build('webR/chan/serviceworker.ts', './dist/webr-serviceworker.mjs', 'neutral'),
    build('webR/chan/serviceworker.ts', './dist/webr-serviceworker.js', 'browser'),
    build('webR/webr-worker.ts', './dist/webr-worker.js', 'node'),
    build('webR/webr-main.ts', './dist/webr.cjs', 'node'),
    build('webR/webr-main.ts', './dist/webr.mjs', 'neutral'),
  ]
};
const allOutputs = outputs.browser.concat(outputs.npm);

allOutputs.forEach((build) => {
  build
    .then((context) => {
      context.rebuild();
      return context;
    })
    .then((context) => {
      if (serve) context.watch();
    })
    .catch((reason) => {
      console.error(reason);
      throw new Error('A problem occured building webR distribution with esbuild');
    });
  }
);

if (serve) {
  outputs.browser[0]
    .then((context) => {
      context.serve({ servedir: '../dist', port: 8001 }).then(() => {
        http
          .createServer((req, res) => {
            const { url, method, headers } = req;
            req.pipe(
              http.request(
                { hostname: '127.0.0.1', port: 8001, path: url, method, headers },
                (proxyRes) => {
                  const client = res.writeHead(proxyRes.statusCode!, {
                    ...proxyRes.headers,
                    'cross-origin-opener-policy': 'same-origin',
                    'cross-origin-embedder-policy': 'require-corp',
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
      throw new Error('A problem occured service webR distribution with esbuild');
    });
} else {
  allOutputs.forEach(build => {
    build.then((context) => {
      context.dispose();
    });
  });
}
