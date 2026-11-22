const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const backendRoot = path.join(__dirname, '..');
const marker = path.join(backendRoot, 'src', 'generated', 'prisma', 'index.js');

function generate() {
  return spawnSync('npx', ['prisma', 'generate'], {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: true,
  });
}

if (fs.existsSync(marker)) {
  process.exit(0);
}

let result = generate();
if (result.status === 0 || fs.existsSync(marker)) {
  process.exit(0);
}

console.warn('[ensure-prisma] prisma generate failed (often EPERM if a dev server holds engine files). Retrying once…');
result = generate();
process.exit(result.status === 0 || fs.existsSync(marker) ? 0 : result.status ?? 1);
