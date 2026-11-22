/**

 * Run tsx watch from the monorepo hoisted install.

 */

import { spawn, spawnSync } from 'node:child_process';

import { createRequire } from 'node:module';

import { existsSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';



const backendRoot = process.cwd();

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const entry = process.argv[2] || 'src/server.ts';

const ensureScript = join(repoRoot, 'scripts', 'ensure-esbuild.mjs');

const cachedExe = join(repoRoot, 'scripts', '.cache', 'esbuild-0.28.1-win32-x64.exe');



function resolveTsxCli() {

  const requireBackend = createRequire(join(backendRoot, 'package.json'));

  const requireRoot = createRequire(join(repoRoot, 'package.json'));

  for (const req of [requireBackend, requireRoot]) {

    try {

      const pkg = req.resolve('tsx/package.json');

      return join(dirname(pkg), 'dist', 'cli.mjs');

    } catch {

      /* try next */

    }

  }

  return null;

}



function esbuildOk(binaryPath) {

  const requireRoot = createRequire(join(repoRoot, 'package.json'));

  const prev = process.env.ESBUILD_BINARY_PATH;

  if (binaryPath) process.env.ESBUILD_BINARY_PATH = binaryPath;

  try {

    requireRoot('esbuild').buildSync({

      stdin: { contents: 'export const ok = true', loader: 'ts', resolveDir: repoRoot },

      write: false,

      bundle: true,

      logLevel: 'silent',

    });

    return true;

  } catch {

    return false;

  } finally {

    if (prev === undefined) delete process.env.ESBUILD_BINARY_PATH;

    else process.env.ESBUILD_BINARY_PATH = prev;

  }

}



function tryRepairEsbuild() {

  console.warn('[dev] Repairing esbuild (one attempt)…');

  const r = spawnSync(process.execPath, [ensureScript], {

    cwd: repoRoot,

    stdio: 'inherit',

    env: process.env,

  });

  return r.status === 0;

}



const tsxCli = resolveTsxCli();

if (!tsxCli || !existsSync(tsxCli)) {

  console.error('[dev] tsx not found. From repo root run: pnpm install');

  process.exit(1);

}



function resolveEsbuildBinaryPath() {
  const fromEnv = process.env.ESBUILD_BINARY_PATH;
  if (fromEnv && !existsSync(fromEnv)) {
    delete process.env.ESBUILD_BINARY_PATH;
  }
  if (existsSync(cachedExe)) return cachedExe;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return undefined;
}

let binaryPath = resolveEsbuildBinaryPath();



if (!esbuildOk(binaryPath)) {

  if (!tryRepairEsbuild()) {

    console.error(

      '[dev] esbuild native binary is missing or mismatched (tsx needs it).\n' +

        '  From repo root:  pnpm fix:esbuild\n' +

        '  Stop Next.js / all node processes first if you see EPERM.'

    );

    process.exit(1);

  }

  binaryPath = resolveEsbuildBinaryPath();

  if (!esbuildOk(binaryPath)) {

    console.error('[dev] esbuild still broken after repair. Run: pnpm fix:esbuild');

    process.exit(1);

  }

}



const childEnv = { ...process.env };

if (binaryPath) childEnv.ESBUILD_BINARY_PATH = binaryPath;



const child = spawn(process.execPath, [tsxCli, 'watch', entry], {

  cwd: backendRoot,

  stdio: 'inherit',

  env: childEnv,

});

child.on('exit', (code) => process.exit(code ?? 0));


