import { prisma } from '../config/database';
import { disciplineSettingsService } from './discipline-settings.service';

export function signedPoints(type: string, points: number) {
  const abs = Math.abs(points);
  return type === 'REWARD' ? abs : -abs;
}

export function computeScoreAfter(currentScore: number, appliedPoints: number, maxScore = 100) {
  return Math.max(0, Math.min(maxScore, currentScore + appliedPoints));
}

async function orgScores(organizationId: string) {
  return disciplineSettingsService.getScores(organizationId);
}

export const studentBalanceService = {
  async getOrCreate(
    organizationId: string,
    student: {
      studentId: string;
      studentCode?: string;
      studentName: string;
      className?: string;
      classId?: string;
    }
  ) {
    const existing = await prisma.studentDisciplineBalance.findUnique({
      where: {
        organizationId_studentId: { organizationId, studentId: student.studentId },
      },
    });
    if (existing) return existing;

    const scores = await orgScores(organizationId);
    return prisma.studentDisciplineBalance.create({
      data: {
        organizationId,
        studentId: student.studentId,
        studentCode: student.studentCode,
        studentName: student.studentName,
        className: student.className,
        classId: student.classId,
        currentScore: scores.startingScore,
        maxScore: scores.maxScore,
      },
    });
  },

  async getProfile(organizationId: string, studentId: string) {
    const scores = await orgScores(organizationId);
    const [balance, caseCount, termCount] = await Promise.all([
      prisma.studentDisciplineBalance.findUnique({
        where: { organizationId_studentId: { organizationId, studentId } },
      }),
      prisma.disciplineCase.count({ where: { organizationId, studentId } }),
      prisma.disciplineCase.count({
        where: {
          organizationId,
          studentId,
          createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
        },
      }),
    ]);

    if (!balance) {
      return {
        studentId,
        currentScore: scores.startingScore,
        maxScore: scores.maxScore,
        totalCases: caseCount,
        casesThisTerm: termCount,
        initialized: false,
      };
    }
    const maxScore = scores.maxScore;
    const currentScore = Math.min(balance.currentScore, maxScore);
    return {
      ...balance,
      maxScore,
      currentScore,
      totalCases: Math.max(balance.totalCases, caseCount),
      casesThisTerm: Math.max(balance.casesThisTerm, termCount),
      initialized: true,
    };
  },

  async applyCasePoints(
    organizationId: string,
    studentId: string,
    appliedPoints: number,
    studentInfo?: {
      studentCode?: string;
      studentName?: string;
      className?: string;
      classId?: string;
    }
  ) {
    const balance = await this.getOrCreate(organizationId, {
      studentId,
      studentCode: studentInfo?.studentCode,
      studentName: studentInfo?.studentName ?? 'Student',
      className: studentInfo?.className,
      classId: studentInfo?.classId,
    });

    const scoreBefore = balance.currentScore;
    const scoreAfter = computeScoreAfter(scoreBefore, appliedPoints, balance.maxScore);

    const updated = await prisma.studentDisciplineBalance.update({
      where: { id: balance.id },
      data: {
        currentScore: scoreAfter,
        totalCases: { increment: 1 },
        casesThisTerm: { increment: 1 },
        studentCode: studentInfo?.studentCode ?? balance.studentCode,
        studentName: studentInfo?.studentName ?? balance.studentName,
        className: studentInfo?.className ?? balance.className,
        classId: studentInfo?.classId ?? balance.classId,
      },
    });

    return { scoreBefore, scoreAfter, balance: updated };
  },
};
