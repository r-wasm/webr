// Minimal test for importing webR using CommonJS with esbuild
const { WebR } = require('webr');

async function main() {
  console.log('Attempting to import webR...');

  if (typeof WebR === 'function') {
    console.log('✓ Successfully imported webR package using CommonJS with esbuild');

    try {
      const webR = new WebR({ baseUrl: '../../../../dist/' });
      await webR.init();
      console.log('✓ WebR instance created successfully');
      const result = await webR.evalRNumber('123 + 456');
      console.log('✓ R evaluation result:', result); // Should log: 579
      webR.close();
    } catch (error) {
      console.error('WebR instantiation failed:', error.message);
      process.exit(1);
    }
  } else {
    console.error('✗ Failed to import WebR');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
