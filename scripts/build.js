const fs = require('fs-extra');
const path = require('path');

const sourceFiles = [
  'background.js',
  'icons',
  'manifest.json',
  'options',
  'popup',
  'rules.json'
];

async function build() {
  try {
    // Ensure dist/chrome directory exists and is empty
    await fs.ensureDir('dist/chrome');
    await fs.emptyDir('dist/chrome');

    // Copy all source files to dist/chrome
    for (const file of sourceFiles) {
      await fs.copy(file, path.join('dist/chrome', file));
    }

    console.log('Build completed successfully!');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build(); 