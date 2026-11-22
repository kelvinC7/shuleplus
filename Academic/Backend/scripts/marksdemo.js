#!/usr/bin/env node
/**
 * Launcher for marks demo CLI (runs TypeScript via tsx).
 * Usage: node scripts/marksdemo.js apply --class "P1" --year "2025-2026" --term "Term 1"
 */
const { spawnSync } = require('child_process');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const cli = path.join(__dirname, 'marksdemo.cli.ts');
const args = process.argv.slice(2);

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(cmd, ['tsx', cli, ...args], {
  stdio: 'inherit',
  cwd: backendRoot,
  shell: true,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
