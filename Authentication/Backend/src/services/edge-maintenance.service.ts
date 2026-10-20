import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { env } from '../config/env';

const execFileAsync = promisify(execFile);

const DEFAULT_FLAG = '/var/www/shuleplus/maintenance/ON';

function flagPath(): string {
  return env.NGINX_MAINTENANCE_FLAG_PATH?.trim() || DEFAULT_FLAG;
}

function maintenanceDir(): string {
  return path.dirname(flagPath());
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export class EdgeMaintenanceService {
  async isEnabled(): Promise<boolean> {
    return pathExists(flagPath());
  }

  async setEnabled(enabled: boolean): Promise<{ enabled: boolean; applied: boolean; message?: string }> {
    const script = env.NGINX_MAINTENANCE_SCRIPT?.trim();

    if (script) {
      try {
        await execFileAsync(script, [enabled ? 'enable' : 'disable'], { timeout: 30_000 });
        return { enabled: await this.isEnabled(), applied: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Maintenance script failed';
        return { enabled: await this.isEnabled(), applied: false, message };
      }
    }

    const dir = maintenanceDir();
    const flag = flagPath();

    try {
      await fs.mkdir(dir, { recursive: true });
      if (enabled) {
        await fs.writeFile(flag, `enabled-at=${new Date().toISOString()}\n`, 'utf8');
      } else if (await pathExists(flag)) {
        await fs.unlink(flag);
      }
      return { enabled: await this.isEnabled(), applied: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update maintenance flag';
      return { enabled: await this.isEnabled(), applied: false, message };
    }
  }
}

export const edgeMaintenanceService = new EdgeMaintenanceService();
