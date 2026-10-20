-- Align assessment levels with Student Management class categories + workflow status
ALTER TYPE "AssessmentLevel" ADD VALUE IF NOT EXISTS 'NURSERY';
ALTER TYPE "AssessmentLevel" ADD VALUE IF NOT EXISTS 'SECONDARY';
ALTER TYPE "AssessmentLevel" ADD VALUE IF NOT EXISTS 'TVET';

ALTER TYPE "AssessmentTemplateStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
