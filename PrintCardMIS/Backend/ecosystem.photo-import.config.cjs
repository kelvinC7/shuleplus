/**
 * PM2 process for the photo import worker (always-on).
 *
 *   cd /var/www/shuleplus/PrintCardMIS/Backend   # adjust path
 *   pm2 start ecosystem.photo-import.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'print-card-photo-worker',
      cwd: __dirname,
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/workers/photo-import.worker.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      watch: false,
      env: {
        NODE_ENV: 'production',
        // Override in server .env: IMPORT_ROOT=/var/www/shuleplus/imports
        PHOTO_IMPORT_POLL_MS: '2000',
        PHOTO_IMPORT_CONCURRENCY: '3',
        PHOTO_IMPORT_ZIP_RETENTION_DAYS: '7',
      },
    },
  ],
};
