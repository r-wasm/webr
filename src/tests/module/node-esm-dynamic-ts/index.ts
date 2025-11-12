// Minimal test for importing webR using dynamic ESM import() with TypeScript

async function main() {
  console.log('Attempting to dynamically import webR...');

  try {
    const { WebR } = await import('webr');

    if (typeof WebR === 'function') {
      console.log('✓ Successfully imported webR package using dynamic import() with TypeScript');

      try {
        const webR = new WebR({ baseUrl: '../../../../dist/' });
        await webR.init();
        console.log('✓ WebR instance created successfully');
        const result = await webR.evalRNumber('123 + 456');
        console.log('✓ R evaluation result:', result); // Should log: 579
        webR.close();
      } catch (error) {
        console.error('WebR instantiation failed:', (error as Error).message);
        process.exit(1);
      }
    } else {
      console.error('✗ Failed to import WebR');
      process.exit(1);
    }
  } catch (error) {
    console.error('Dynamic import failed:', (error as Error).message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
