import fs from 'fs/promises';
import path from 'path';
import { env } from '../../config/env';

export type ImportOrgDirs = {
  root: string;
  incoming: string;
  processing: string;
  completed: string;
  failed: string;
};

export function orgImportDirs(organizationId: string): ImportOrgDirs {
  const root = path.join(env.IMPORT_ROOT, organizationId);
  return {
    root,
    incoming: path.join(root, 'incoming'),
    processing: path.join(root, 'processing'),
    completed: path.join(root, 'completed'),
    failed: path.join(root, 'failed'),
  };
}

export async function ensureOrgImportDirs(organizationId: string): Promise<ImportOrgDirs> {
  const dirs = orgImportDirs(organizationId);
  await Promise.all([
    fs.mkdir(dirs.incoming, { recursive: true }),
    fs.mkdir(dirs.processing, { recursive: true }),
    fs.mkdir(dirs.completed, { recursive: true }),
    fs.mkdir(dirs.failed, { recursive: true }),
  ]);
  return dirs;
}

export function jobWorkDir(organizationId: string, jobId: string): string {
  return path.join(orgImportDirs(organizationId).processing, jobId);
}

export function safeFilename(original: string): string {
  const base = path.basename(original).replace(/[^\w.\-()+ ]+/g, '_').slice(0, 180);
  return base || `file-${Date.now()}`;
}

export async function moveDir(from: string, to: string): Promise<void> {
  await fs.mkdir(path.dirname(to), { recursive: true });
  try {
    await fs.rename(from, to);
  } catch {
    await fs.cp(from, to, { recursive: true });
    await fs.rm(from, { recursive: true, force: true });
  }
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
