import { WebR } from 'webr';

async function main() {
  console.log('Attempting to import webR...');

  if (typeof WebR === 'function') {
    console.log('✓ Successfully imported webR package using Vite with TypeScript');

    try {
      const webR = new WebR({ baseUrl: 'http://localhost:3000/webr-dist/' });
      await webR.init();
      console.log('✓ WebR instance created successfully');
      const result = await webR.evalRNumber('123 + 456');
      console.log('✓ R evaluation result:', result); // Should log: 579
      webR.close();

      // Signal success to test runner
      document.body.dataset.testStatus = 'success';
    } catch (error) {
      console.error('WebR instantiation failed:', (error as Error).message);
      document.body.dataset.testStatus = 'error';
    }
  } else {
    console.error('✗ Failed to import WebR');
    document.body.dataset.testStatus = 'error';
  }
}

main().catch(error => {
  console.error('Error:', error);
  document.body.dataset.testStatus = 'error';
});
