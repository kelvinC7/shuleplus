import path from 'node:path';
import { env } from './env';

/** Absolute path to the module's uploads directory (independent of the process cwd). */
export const uploadDir = path.resolve(__dirname, '..', '..', env.UPLOAD_DIR);
