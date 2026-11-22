/**
 * Align esbuild@0.28.x with the Windows native binary (tsx dev dependency).
 * Run from repo root: pnpm fix:esbuild
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const requireRoot = createRequire(join(root, 'package.json'));
const cacheDir = join(root, 'scripts', '.cache');
const cachedExe = join(cacheDir, 'esbuild-0.28.1-win32-x64.exe');
const cacheMarker = join(cacheDir, 'esbuild-0.28.1-win32-x64.ok');

export function cachedEsbuildBinaryPath() {
  return existsSync(cachedExe) ? cachedExe : null;
}

function run(args, runCwd = root) {
  const r = spawnSync('pnpm', args, { cwd: runCwd, stdio: 'inherit', shell: true });
  return r.status ?? 1;
}

function win32PackageDir() {
  try {
    return dirname(requireRoot.resolve('@esbuild/win32-x64/package.json'));
  } catch {
    return null;
  }
}

function win32BinaryPresent() {
  const pkgDir = win32PackageDir();
  if (pkgDir && existsSync(join(pkgDir, 'esbuild.exe'))) return true;
  const pnpmDir = join(root, 'node_modules', '.pnpm');
  if (!existsSync(pnpmDir)) return false;
  for (const entry of readdirSync(pnpmDir)) {
    if (!entry.startsWith('@esbuild+win32-x64@0.28')) continue;
    const exe = join(pnpmDir, entry, 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe');
    if (existsSync(exe)) return true;
  }
  return existsSync(cachedExe);
}

function esbuildServiceOk() {
  if (process.env.ESBUILD_BINARY_PATH && !existsSync(process.env.ESBUILD_BINARY_PATH)) {
    delete process.env.ESBUILD_BINARY_PATH;
  }
  const cached = cachedEsbuildBinaryPath();
  const prev = process.env.ESBUILD_BINARY_PATH;
  if (cached) process.env.ESBUILD_BINARY_PATH = cached;
  try {
    requireRoot('esbuild').buildSync({
      stdin: { contents: 'export const ok = true', loader: 'ts', resolveDir: root },
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

/** Extract esbuild.exe from npm tarball when pnpm left @esbuild/win32-x64 empty (EPERM / lock). */
async function downloadWin32EsbuildToCache() {
  if (existsSync(cacheMarker) && existsSync(cachedExe)) return true;

  mkdirSync(cacheDir, { recursive: true });
  const tgzPath = join(cacheDir, 'win32-x64-0.28.1.tgz');
  const url = 'https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.28.1.tgz';

  console.warn('[fix:esbuild] Downloading @esbuild/win32-x64 binary…');
  const res = await fetch(url);
  if (!res.ok) {
    console.error('[fix:esbuild] Download failed:', res.status, res.statusText);
    return false;
  }
  await pipeline(res.body, createWriteStream(tgzPath));

  const extractDir = join(cacheDir, 'win32-x64-extract');
  rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });

  const tar = spawnSync('tar', ['-xzf', tgzPath, '-C', extractDir], { shell: true, stdio: 'inherit' });
  if (tar.status !== 0) {
    console.error('[fix:esbuild] tar extract failed (Windows 10+ includes tar).');
    return false;
  }

  const extractedExe = join(extractDir, 'package', 'esbuild.exe');
  if (!existsSync(extractedExe)) {
    console.error('[fix:esbuild] esbuild.exe not found in downloaded package.');
    return false;
  }

  copyFileSync(extractedExe, cachedExe);
  writeFileSync(cacheMarker, new Date().toISOString(), 'utf8');

  const pkgDir = win32PackageDir();
  if (pkgDir) {
    try {
      copyFileSync(extractedExe, join(pkgDir, 'esbuild.exe'));
    } catch {
      /* EPERM if locked; cache path still works via ESBUILD_BINARY_PATH */
    }
  }

  rmSync(extractDir, { recursive: true, force: true });
  return true;
}

function runInstallJs() {
  const pnpmDir = join(root, 'node_modules', '.pnpm');
  if (!existsSync(pnpmDir)) return;
  for (const entry of readdirSync(pnpmDir)) {
    if (!entry.startsWith('esbuild@0.28')) continue;
    const dir = join(pnpmDir, entry, 'node_modules', 'esbuild');
    const installJs = join(dir, 'install.js');
    if (!existsSync(installJs)) continue;
    const version = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
    console.warn('[fix:esbuild] postinstall for esbuild', version);
    spawnSync(process.execPath, [installJs], { cwd: dir, stdio: 'inherit' });
  }
}

async function main() {
  if (!force && esbuildServiceOk()) {
    process.exit(0);
  }

  runInstallJs();

  if (!win32BinaryPresent()) {
    await downloadWin32EsbuildToCache();
  }

  if (!esbuildServiceOk() && !win32BinaryPresent()) {
    console.warn('[fix:esbuild] Installing workspace esbuild + @esbuild/win32-x64…');
    run(['add', '-w', 'esbuild@0.28.1', '@esbuild/win32-x64@0.28.1']);
    runInstallJs();
    if (!win32BinaryPresent()) {
      await downloadWin32EsbuildToCache();
    }
  }

  if (!esbuildServiceOk()) {
    console.error(
      '[fix:esbuild] Still broken.\n' +
        '  1) Stop all Node / Next.js dev processes\n' +
        '  2) From repo root: pnpm fix:esbuild\n' +
        '  3) If EPERM persists: delete ParentMIS\\Frontend\\node_modules, then pnpm install'
    );
    process.exit(1);
  }

  console.warn('[fix:esbuild] OK. Backend dev uses scripts/.cache/esbuild if pnpm binary is missing.');
}

main();
