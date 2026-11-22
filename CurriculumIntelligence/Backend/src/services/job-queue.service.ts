import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { runPdfExtractionJob } from './extraction.service';

let queue: Queue | null = null;
let worker: Worker | null = null;

function connection() {
  if (!env.REDIS_URL) return null;
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export function startExtractionWorker() {
  if (!env.REDIS_URL || worker) return;
  const conn = connection();
  if (!conn) return;

  worker = new Worker(
    'curriculum-extract',
    async (job) => {
      const jobId = job.data?.jobId as string;
      if (!jobId) throw new Error('Missing jobId');
      await runPdfExtractionJob(jobId);
    },
    { connection: conn }
  );

  worker.on('failed', (job, err) => {
    console.error('[Curriculum] extraction worker failed', job?.id, err.message);
  });

  console.log('[Curriculum] BullMQ extraction worker started');
}

export function getExtractionQueue(): Queue | null {
  if (!env.REDIS_URL) return null;
  if (!queue) {
    const conn = connection();
    if (!conn) return null;
    queue = new Queue('curriculum-extract', { connection: conn });
  }
  return queue;
}

export async function enqueuePdfExtraction(jobId: string) {
  const q = getExtractionQueue();
  if (q) {
    await q.add('extract', { jobId }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    return { mode: 'queued' as const };
  }
  void runPdfExtractionJob(jobId);
  return { mode: 'inline' as const };
}
