import { AppError } from '../middleware/error.middleware';
import { fetchRegisteredSchools, fetchSchoolProfile } from '../clients/iam.client';
import {
  approveCircular,
  fetchCircular,
  fetchCirculars,
  postCircularComment,
  rejectCircular,
  unpublishCircular,
} from '../clients/babyeyi.client';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

function actorFrom(req: AuthenticatedRequest): string {
  return req.user?.name || req.user?.email || 'NESA Officer';
}

export class IntegrationService {
  async listSchools(query: Record<string, string | undefined>) {
    try {
      return await fetchRegisteredSchools({
        status: query.status ?? 'ACTIVE',
        type: query.type,
        province: query.province,
        district: query.district,
        search: query.search ?? query.q,
        limit: query.limit,
      });
    } catch (err) {
      throw new AppError(
        502,
        err instanceof Error ? err.message : 'Failed to load schools from Authentication'
      );
    }
  }

  async getSchool(organizationId: string) {
    try {
      const profile = await fetchSchoolProfile(organizationId);
      if (!profile) throw new AppError(404, 'School not found');
      return profile;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        502,
        err instanceof Error ? err.message : 'Failed to load school profile from Authentication'
      );
    }
  }

  async listCirculars(query: Record<string, string | undefined>) {
    try {
      return await fetchCirculars({
        organizationId: query.organizationId ?? query.schoolId,
        status: query.status,
        academicYear: query.academicYear ?? query.academic_year,
        district: query.district,
        search: query.search ?? query.q,
        limit: query.limit,
      });
    } catch (err) {
      throw new AppError(
        502,
        err instanceof Error ? err.message : 'Failed to load circulars from BabyeyiWizard'
      );
    }
  }

  async getCircular(id: string) {
    try {
      return await fetchCircular(id);
    } catch (err) {
      throw new AppError(
        502,
        err instanceof Error ? err.message : 'Failed to load circular from BabyeyiWizard'
      );
    }
  }

  async commentOnCircular(req: AuthenticatedRequest, id: string, content: string) {
    try {
      return await postCircularComment(id, content, actorFrom(req));
    } catch (err) {
      throw new AppError(502, err instanceof Error ? err.message : 'Failed to add comment');
    }
  }

  async rejectCircular(req: AuthenticatedRequest, id: string, reason: string) {
    try {
      return await rejectCircular(id, reason, actorFrom(req));
    } catch (err) {
      throw new AppError(502, err instanceof Error ? err.message : 'Failed to reject circular');
    }
  }

  async unpublishCircular(req: AuthenticatedRequest, id: string, reason: string) {
    try {
      return await unpublishCircular(id, reason, actorFrom(req));
    } catch (err) {
      throw new AppError(502, err instanceof Error ? err.message : 'Failed to unpublish circular');
    }
  }

  async approveCircular(req: AuthenticatedRequest, id: string, notes?: string) {
    try {
      return await approveCircular(id, notes, actorFrom(req));
    } catch (err) {
      throw new AppError(502, err instanceof Error ? err.message : 'Failed to approve circular');
    }
  }

  async printCircular(id: string, lang?: string) {
    try {
      const { fetchCircularPrintHtml } = await import('../clients/babyeyi.client');
      return await fetchCircularPrintHtml(id, lang ?? 'en');
    } catch (err) {
      throw new AppError(502, err instanceof Error ? err.message : 'Failed to load circular preview');
    }
  }
}

export const integrationService = new IntegrationService();
