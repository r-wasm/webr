import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3002;

// Install Playwright browsers if needed
try {
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  console.log('\n');
} catch (error) {
  console.error('Failed to install Playwright browsers');
  process.exit(1);
}

// Run build command
console.log('Building application...\n');
try {
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

// Create a simple static file server
const server = createServer((req, res) => {
  try {
    const url = decodeURIComponent(req.url.split('?')[0]);

    let filePath;
    if (url === '/' || url === '/index.html') {
      filePath = join(__dirname, 'index.html');
    } else if (url.startsWith('/webr-dist/')) {
      filePath = join(__dirname, '../../../dist/', url.substring(11));
    } else {
      // Serve app files
      filePath = join(__dirname, url);
    }

    const content = readFileSync(filePath);

    const ext = filePath.split('.').pop();
    const contentTypes = {
      'html': 'text/html',
      'js': 'application/javascript',
      'mjs': 'application/javascript',
      'wasm': 'application/wasm',
      'data': 'application/octet-stream',
    };

    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'text/plain',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('Not found: ' + req.url);
  }
});

server.listen(PORT);

console.log(`\nTest server running at http://localhost:${PORT}`);
console.log('Running browser test...\n');

// Run the test with Playwright
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Collect console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.error(text);
    } else {
      console.log(text);
    }
  });

  // Navigate to the test page
  await page.goto(`http://localhost:${PORT}/index.html`);

  // Wait for test to complete (check for data-test-status attribute)
  await page.waitForFunction(() => {
    return document.body.dataset.testStatus !== undefined;
  }, { timeout: 30000 });

  const testStatus = await page.evaluate(() => document.body.dataset.testStatus);

  await browser.close();
  server.close();

  if (testStatus === 'success') {
    console.log('\n✓ Esbuild browser test passed!');
    process.exit(0);
  } else {
    console.error('\n✗ Esbuild browser test failed!');
    process.exit(1);
  }
})();
