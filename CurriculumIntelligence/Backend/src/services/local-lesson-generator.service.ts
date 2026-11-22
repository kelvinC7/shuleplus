import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import type { RebStageKey } from '../utils/timing';
import { REB_STAGE_KEYS } from '../utils/timing';

const SCRIPT = path.resolve(
  process.cwd(),
  env.LESSON_PLAN_PYTHON_SCRIPT || '../worker/generate_lesson_plan.py'
);

export interface PythonLessonPlanResult {
  engine: string;
  instructionalObjective: string;
  learningMaterials: string;
  stages: Array<{
    key: string;
    title: string;
    minutes: number;
    teacherActivities: string;
    learnerActivities: string;
    genericCompetences: string;
    crossCuttingIssues: string;
  }>;
  assessmentQuestions: string[];
  homework: string[];
  intelligenceSummary?: string;
  meta?: Record<string, unknown>;
}

export function isLocalLessonEngineEnabled(): boolean {
  const mode = env.LESSON_PLAN_ENGINE;
  if (mode === 'cloud') return false;
  if (mode === 'python' || mode === 'local') return true;
  if (mode === 'hybrid') return true;
  return env.AI_PROVIDER === 'local';
}

export function usePythonForGeneration(): boolean {
  const mode = env.LESSON_PLAN_ENGINE;
  if (mode === 'cloud') return false;
  return mode === 'python' || mode === 'local' || mode === 'hybrid';
}

export function usePythonForRegenerate(): boolean {
  if (env.LESSON_PLAN_ENGINE === 'cloud') return false;
  return usePythonForGeneration() || env.AI_PROVIDER === 'local';
}

function runPythonGenerator(payload: Record<string, unknown>): Promise<PythonLessonPlanResult> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(SCRIPT)) {
      return reject(new AppError(503, `Lesson plan Python worker not found: ${SCRIPT}`));
    }

    const proc = spawn(env.PYTHON_BIN, [SCRIPT], {
      cwd: path.dirname(SCRIPT),
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => {
      stdout += d.toString('utf8');
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
    });
    proc.on('error', (err) => reject(new AppError(503, err.message)));
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new AppError(502, stderr.trim() || `Python lesson generator exited ${code}`));
      }
      try {
        const trimmed = stdout.trim();
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        const json = start >= 0 ? trimmed.slice(start, end + 1) : trimmed;
        resolve(JSON.parse(json) as PythonLessonPlanResult);
      } catch {
        reject(new AppError(502, 'Invalid JSON from Python lesson generator'));
      }
    });

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

export async function generateFromPythonWorker(input: {
  lesson: { title: string; lessonNumber?: string | null; materials?: unknown };
  book: { title: string; subject: string; grade: string };
  unit: { unitNumber: string; title: string };
  objectives: string[];
  corpus: string;
  structured?: Record<string, unknown>;
  companionBookId?: string | null;
  durationMinutes: number;
  stageMinutes: Record<RebStageKey, number>;
  materialsHint?: string;
  regenerateStage?: RebStageKey;
}): Promise<PythonLessonPlanResult> {
  const result = await runPythonGenerator({
    lesson: input.lesson,
    book: input.book,
    unit: input.unit,
    objectives: input.objectives,
    corpus: input.corpus.slice(0, 14000),
    structured: input.structured ?? {},
    companionBookId: input.companionBookId ?? null,
    durationMinutes: input.durationMinutes,
    stageMinutes: input.stageMinutes,
    materialsHint: input.materialsHint,
    regenerateStage: input.regenerateStage,
  });

  if (input.regenerateStage) {
    const stage = result.stages.find((s) => s.key === input.regenerateStage);
    if (!stage) {
      throw new AppError(502, `Python engine did not return stage ${input.regenerateStage}`);
    }
  }

  return result;
}

export function localEngineStageKeys(): readonly RebStageKey[] {
  return REB_STAGE_KEYS;
}
