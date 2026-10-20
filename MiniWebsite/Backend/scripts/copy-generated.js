const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'generated');
const dest = path.join(__dirname, '..', 'dist', 'generated');

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Copied src/generated -> dist/generated');
