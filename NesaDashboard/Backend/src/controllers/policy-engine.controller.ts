import { Request, Response, NextFunction } from 'express';
import { policyEngineService, type ResolveInput } from '../services/policy-engine.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function resolveFromQuery(req: Request): ResolveInput {
  const q = req.query as Record<string, string | string[] | undefined>;
  const one = (key: string) => {
    const v = q[key];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    ownershipType: one('ownershipType') ?? one('ownership_type') ?? one('category'),
    feeTargetStudents: one('feeTargetStudents') ?? one('fee_target_students'),
    academicYear: one('academicYear') ?? one('academic_year'),
    term: one('term'),
    educationLevel: one('educationLevel') ?? one('education_level') ?? one('level'),
    studentType: one('studentType') ?? one('student_type'),
    classLabel: one('classLabel') ?? one('class_label') ?? one('class') ?? one('level'),
    enteredTuitionRwf: one('enteredTuitionRwf') ? Number(one('enteredTuitionRwf')) : null,
    enteredGeneralAssemblyRwf: one('enteredGeneralAssemblyRwf')
      ? Number(one('enteredGeneralAssemblyRwf'))
      : null,
    enteredTotalRwf: one('enteredTotalRwf') ? Number(one('enteredTotalRwf')) : null,
  };
}

function resolveFromBody(body: ResolveInput): ResolveInput {
  return {
    ownershipType: body.ownershipType ?? (body as { ownership_type?: string }).ownership_type,
    feeTargetStudents:
      body.feeTargetStudents ?? (body as { fee_target_students?: string }).fee_target_students,
    academicYear: body.academicYear ?? (body as { academic_year?: string }).academic_year,
    term: body.term,
    educationLevel:
      body.educationLevel ??
      (body as { education_level?: string }).education_level ??
      (body as { level?: string }).level,
    studentType: body.studentType ?? (body as { student_type?: string }).student_type,
    classLabel:
      body.classLabel ??
      (body as { class_label?: string }).class_label ??
      (body as { class?: string }).class,
    enteredTuitionRwf: body.enteredTuitionRwf,
    enteredGeneralAssemblyRwf: body.enteredGeneralAssemblyRwf,
    enteredTotalRwf: body.enteredTotalRwf,
  };
}

export class PolicyEngineController {
  async resolve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input =
        req.method === 'GET' ? resolveFromQuery(req) : resolveFromBody(req.body as ResolveInput);
      const data = await policyEngineService.resolve(input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async simulate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await policyEngineService.simulate(resolveFromBody(req.body as ResolveInput));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /** Service-auth endpoint for Babyeyi */
  async resolveInternal(req: Request, res: Response, next: NextFunction) {
    try {
      const input =
        req.method === 'GET' ? resolveFromQuery(req) : resolveFromBody(req.body as ResolveInput);
      const data = await policyEngineService.resolve(input);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const policyEngineController = new PolicyEngineController();
