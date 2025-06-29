const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { version } = require('../package.json');

async function createZip() {
  // Ensure build/chrome directory exists
  await fs.ensureDir('build/chrome');

  const outputFile = path.join('build/chrome', `blocker-v${version}.zip`);
  const output = fs.createWriteStream(outputFile);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  output.on('close', () => {
    console.log(`Archive created successfully: ${outputFile}`);
    console.log(`Total bytes: ${archive.pointer()}`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory('dist/chrome/', false);
  await archive.finalize();
}

createZip().catch(err => {
  console.error('Failed to create zip:', err);
  process.exit(1);
}); 