#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const moduleDir = __dirname;

console.log('Running module import tests...\n');

// Get all directories in the current directory
const dirs = fs.readdirSync(moduleDir)
  .filter(file => {
    const fullPath = path.join(moduleDir, file);
    return fs.statSync(fullPath).isDirectory() && file !== 'node_modules';
  });

let allPassed = true;

for (const dir of dirs) {
  console.log('================================');
  console.log(`Testing: ${dir}`);
  console.log('================================');

  const dirPath = path.join(moduleDir, dir);

  try {
    // Run npm install
    execSync('npm ci', {
      cwd: dirPath,
      stdio: 'inherit'
    });

    // Run npm test
    execSync('npm test', {
      cwd: dirPath,
      stdio: 'inherit'
    });

    console.log('');
  } catch (error) {
    console.error(`\n✗ Test failed in ${dir}\n`);
    allPassed = false;
    process.exit(1);
  }
}

if (allPassed) {
  console.log('================================');
  console.log('✓ All module tests passed!');
  console.log('================================');
}
