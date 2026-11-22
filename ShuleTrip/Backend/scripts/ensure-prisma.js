const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const marker = path.join(__dirname, '..', 'src', 'generated', 'prisma', 'index.js');
if (fs.existsSync(marker)) {
  process.exit(0);
}

const result = spawnSync('npx', ['prisma', 'generate'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status ?? 1);
