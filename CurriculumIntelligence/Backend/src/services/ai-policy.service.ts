import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export type TeacherAiOperation = 'generate' | 'regenerate';

const METERED_OPERATIONS = ['section_regenerate', 'lesson_plan_ai_objective'] as const;

/** Platform kill switch — keys stay on server; teachers never call Groq/OpenAI directly. */
export function isTeacherAiEnabled(): boolean {
  return env.TEACHER_AI_ENABLED;
}

export function getTeacherAiPolicyPublic() {
  return {
    enabled: isTeacherAiEnabled(),
    billingMode: env.AI_BILLING_MODE,
    dailyLimitPerTeacher: env.AI_DAILY_LIMIT_PER_TEACHER,
    dailyLimitPerOrganization: env.AI_DAILY_LIMIT_PER_ORGANIZATION,
    note: isTeacherAiEnabled()
      ? 'AI runs only on Shule+ Curriculum servers. Provider keys are not exposed to browsers.'
      : 'External AI is turned off. Lesson plans use curriculum text and manual edits only.',
  };
}

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function countTeacherAiCallsToday(organizationId: string, teacherId: string): Promise<number> {
  return prisma.aIProcessingLog.count({
    where: {
      createdAt: { gte: startOfUtcDay() },
      operation: { in: [...METERED_OPERATIONS] },
      lessonPlan: {
        organizationId,
        teacherId,
      },
    },
  });
}

async function countOrgAiCallsToday(organizationId: string): Promise<number> {
  return prisma.aIProcessingLog.count({
    where: {
      createdAt: { gte: startOfUtcDay() },
      operation: { in: [...METERED_OPERATIONS] },
      lessonPlan: { organizationId },
    },
  });
}

/** Enforce quotas before any paid/external AI call for teachers. */
export async function assertTeacherAiAllowed(input: {
  organizationId: string;
  teacherId: string;
  operation: TeacherAiOperation;
}): Promise<void> {
  if (!isTeacherAiEnabled()) {
    throw new AppError(
      403,
      'Lesson plan AI is disabled for your school platform. Plans still work using published curriculum — edit fields manually or ask your administrator to enable AI.'
    );
  }

  const teacherLimit = env.AI_DAILY_LIMIT_PER_TEACHER;
  if (teacherLimit > 0) {
    const used = await countTeacherAiCallsToday(input.organizationId, input.teacherId);
    if (used >= teacherLimit) {
      throw new AppError(
        429,
        `Daily AI limit reached (${teacherLimit} requests per teacher). Try again tomorrow, upgrade your plan, or edit the plan manually.`
      );
    }
  }

  const orgLimit = env.AI_DAILY_LIMIT_PER_ORGANIZATION;
  if (orgLimit > 0) {
    const used = await countOrgAiCallsToday(input.organizationId);
    if (used >= orgLimit) {
      throw new AppError(
        429,
        `Your school has reached its daily AI quota (${orgLimit}). Contact your administrator for a paid AI package.`
      );
    }
  }
}
