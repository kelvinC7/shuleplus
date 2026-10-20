import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { academicGet, academicPost, academicPut } from '../clients/academic.client';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

function authHeader(req: AuthenticatedRequest) {
  return (req.headers.authorization as string) ?? undefined;
}

async function proxyGet(
  req: AuthenticatedRequest,
  path: string,
  query?: Record<string, string | undefined>,
) {
  const result = await academicGet<{ success?: boolean; data: unknown }>(
    path,
    orgId(req),
    authHeader(req),
    query,
  );
  return result.data ?? result;
}

async function proxyPost(
  req: AuthenticatedRequest,
  path: string,
  query?: Record<string, string | undefined>,
) {
  const result = await academicPost<{ success?: boolean; data: unknown }>(
    path,
    orgId(req),
    req.body,
    authHeader(req),
    query,
  );
  return result.data ?? result;
}

async function proxyPut(
  req: AuthenticatedRequest,
  path: string,
  query?: Record<string, string | undefined>,
) {
  const result = await academicPut<{ success?: boolean; data: unknown }>(
    path,
    orgId(req),
    req.body,
    authHeader(req),
    query,
  );
  return result.data ?? result;
}

export const assessmentController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, '/assessments', {
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        subjectId: typeof req.query.subjectId === 'string' ? req.query.subjectId : undefined,
        classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        createdBy: typeof req.query.mine === 'string' && req.query.mine === '1' ? req.user?.sub : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, `/assessments/${req.params.id}`);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getTeacherDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, '/assessments/teacher-dashboard', {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, `/assessments/${req.params.id}/statistics`);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyPost(req, '/assessments');
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyPut(req, `/assessments/${req.params.id}/status`);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getMarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, `/assessments/${req.params.id}/marks`);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async enterMarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyPost(req, `/assessments/${req.params.id}/marks`);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async requestCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyPost(req, `/assessments/${req.params.id}/corrections`);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};

export const gradingController = {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, '/grading/dashboard', {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getGradingScale(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, '/grading/grading-scale', {
        academicLevel: typeof req.query.academicLevel === 'string' ? req.query.academicLevel : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getReportCard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { studentId, classId, academicYear } = req.params;
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const data = await proxyGet(req, `/grading/report-card/${studentId}/${classId}/${academicYear}`, { term });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async calculate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, `/grading/calculate/${req.params.assessmentId}`);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async calculateFinal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { templateId, classId, subjectId } = req.params;
      const data = await proxyPost(req, `/grading/calculate-final/${templateId}/${classId}/${subjectId}`);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getPendingCorrections(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, '/grading/corrections');
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async reviewCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyPut(req, `/grading/corrections/${req.params.requestId}`);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};

export const assessmentTemplateController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, '/assessment-templates', {
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        academicLevel: typeof req.query.academicLevel === 'string' ? req.query.academicLevel : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyGet(req, `/assessment-templates/${req.params.id}`);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await proxyPost(req, '/assessment-templates');
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
