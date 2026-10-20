/**
 * PM2 worker: polls PhotoImportJob queue and runs analyze / import.
 * Usage: tsx src/workers/photo-import.worker.ts
 */
import { analyzePhotoImportJob, claimNextAnalyzeJob, claimNextImportJob, cleanupExpiredImports, importPhotoImportJob } from '../services/photo-import/photo-import.service';

const POLL_MS = Number(process.env.PHOTO_IMPORT_POLL_MS ?? 2000);
let busy = false;

async function tick() {
  if (busy) return;
  busy = true;
  try {
    const analyzeId = await claimNextAnalyzeJob();
    if (analyzeId) {
      console.log(`[photo-import] analyzing ${analyzeId}`);
      await analyzePhotoImportJob(analyzeId);
      return;
    }

    const importId = await claimNextImportJob();
    if (importId) {
      console.log(`[photo-import] importing ${importId}`);
      await importPhotoImportJob(importId);
      return;
    }

    if (Math.random() < 0.15) {
      const cleaned = await cleanupExpiredImports();
      if (cleaned > 0) console.log(`[photo-import] cleaned ${cleaned} staging path(s)`);
    }
  } catch (err) {
    console.error('[photo-import] worker error', err);
  } finally {
    busy = false;
  }
}

console.log(`[photo-import] worker started (poll ${POLL_MS}ms)`);
void tick();
setInterval(() => {
  void tick();
}, POLL_MS);
