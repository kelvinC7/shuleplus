/**
 * Repair mixed npm/pnpm installs. Stop dev servers first (Next.js locks Frontend node_modules).
 */
import { rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const nested = [
  join(root, 'ParentMIS', 'Frontend', 'node_modules'),
  join(root, 'ParentMIS', 'Backend', 'node_modules'),
  join(root, 'ShuleTrip', 'Backend', 'node_modules'),
  join(root, 'Authentication', 'Backend', 'node_modules'),
];

console.warn('[repair:deps] Stop all dev servers (especially Parent MIS Next.js) before continuing.\n');

for (const dir of nested) {
  if (!existsSync(dir)) continue;
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    console.warn('[repair:deps] removed', dir);
  } catch (e) {
    console.error('[repair:deps] EPERM — could not remove', dir);
    console.error('         Close terminals running `next dev` / `npm run dev`, then run:');
    console.error('         rmdir /s /q "' + dir + '"');
    process.exit(1);
  }
}

function run(args) {
  const r = spawnSync('pnpm', args, { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run(['install']);
run(['fix:esbuild']);
console.warn('[repair:deps] Done. Use npm run dev inside each Backend folder.');
