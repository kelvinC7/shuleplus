import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3094', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv(
    'JWT_ACCESS_SECRET',
    'dev-access-secret-change-in-production-32chars'
  ),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:5173',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'curriculum-intelligence',
  UPLOAD_DIR: path.resolve(
    process.cwd(),
    process.env.UPLOAD_DIR ?? './uploads/curriculum'
  ),
  /**
   * Lesson plan content engine:
   * - python: Node + Python worker only (Teacher's Guide text, no cloud LLM)
   * - cloud: Azure/Groq/etc. when enabled
   * - hybrid: Python first; cloud only for optional regenerate if AI configured
   */
  LESSON_PLAN_ENGINE: (process.env.LESSON_PLAN_ENGINE ?? 'python').trim().toLowerCase(),
  LESSON_PLAN_PYTHON_SCRIPT: process.env.LESSON_PLAN_PYTHON_SCRIPT ?? '',
  /** auto | azure_openai | groq | gemini | ollama | openai | local — production defaults to azure_openai */
  AI_PROVIDER: (() => {
    const v = (process.env.AI_PROVIDER ?? '').trim().toLowerCase();
    if (v) return v;
    return process.env.NODE_ENV === 'production' ? 'azure_openai' : 'auto';
  })(),
  AZURE_OPENAI_ENDPOINT: (process.env.AZURE_OPENAI_ENDPOINT ?? '').trim(),
  AZURE_OPENAI_API_KEY: (process.env.AZURE_OPENAI_API_KEY ?? '').trim(),
  AZURE_OPENAI_DEPLOYMENT: (process.env.AZURE_OPENAI_DEPLOYMENT ?? '').trim(),
  AZURE_OPENAI_API_VERSION: (process.env.AZURE_OPENAI_API_VERSION ?? '2024-08-01-preview').trim(),
  GROQ_API_KEY: (process.env.GROQ_API_KEY ?? '').trim(),
  GROQ_MODEL: (process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile').trim(),
  GEMINI_API_KEY: (process.env.GEMINI_API_KEY ?? '').trim(),
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? 'llama3.1:8b',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  PYTHON_BIN: process.env.PYTHON_BIN ?? 'python',
  PDF_EXTRACT_SCRIPT: path.resolve(
    process.cwd(),
    process.env.PDF_EXTRACT_SCRIPT ?? '../worker/extract_pdf.py'
  ),
  REDIS_URL: process.env.REDIS_URL ?? '',
  OCR_ENABLED: process.env.OCR_ENABLED !== 'false',
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? 'local',
  MAX_UPLOAD_BYTES: parseInt(process.env.MAX_UPLOAD_BYTES ?? String(80 * 1024 * 1024), 10),
  MAX_PDF_PAGES: parseInt(process.env.MAX_PDF_PAGES ?? '800', 10),
  JOB_CONCURRENCY: parseInt(process.env.JOB_CONCURRENCY ?? '1', 10),
  /** When false, teachers cannot trigger external AI (Improve / AI objectives). Keys remain server-side only. */
  TEACHER_AI_ENABLED: process.env.TEACHER_AI_ENABLED !== 'false',
  /** 0 = unlimited */
  AI_DAILY_LIMIT_PER_TEACHER: parseInt(process.env.AI_DAILY_LIMIT_PER_TEACHER ?? '40', 10),
  AI_DAILY_LIMIT_PER_ORGANIZATION: parseInt(process.env.AI_DAILY_LIMIT_PER_ORGANIZATION ?? '0', 10),
  /** included | prepaid | disabled — reserved for future billing integration */
  AI_BILLING_MODE: (process.env.AI_BILLING_MODE ?? 'included').toLowerCase(),
} as const;
