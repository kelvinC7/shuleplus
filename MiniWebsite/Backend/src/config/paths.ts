import path from 'node:path';
import { env } from './env';

/** Absolute path to the module's uploads directory (independent of the process cwd). */
export const uploadDir = path.resolve(__dirname, '..', '..', env.UPLOAD_DIR);

/** Absolute path to the directory where generated public website HTML files are stored. */
export const sitesDir = path.resolve(__dirname, '..', '..', env.SITES_DIR);
