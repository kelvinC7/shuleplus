import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { actionPlanService } from '../services/action-plan.service';
import { fetchBudgetLines, recordBudgetLineUsage } from '../clients/budget.client';
import { publicUploadPath } from '../middleware/upload.middleware';
import { getUserApRoles, primaryRoleLabel } from '../lib/permissions';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PLAN_STATUSES, PRIORITIES, EXPENSE_CATEGORIES, RESOURCE_TYPES, TEMPLATE_TYPES } from '../constants/action-plan.constants';

function qs(req: AuthenticatedRequest, key: string): string | undefined {
  const v = req.query[key];
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    const first = v[0];
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}

function ps(req: AuthenticatedRequest, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : v;
}

const createPlanSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  strategicGoalId: z.string().optional(),
  objectiveId: z.string().optional(),
  categoryId: z.string().optional(),
  department: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  responsiblePerson: z.string().optional(),
  teamMembers: z.array(z.string()).optional(),
  startDate: z.string().min(1),
  dueDate: z.string().min(1),
  budget: z.number().optional(),
  expectedOutcome: z.string().optional(),
  periodType: z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY', 'WEEKLY']).optional(),
  periodYear: z.number().int().optional(),
  periodQuarter: z.number().int().min(1).max(4).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  periodWeek: z.number().int().min(1).max(53).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().optional(),
  owner: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  sortOrder: z.number().int().optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
  progress: z.number().min(0).max(100).optional(),
  actualHours: z.number().optional(),
});

const createMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string().min(1),
  responsiblePerson: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const createKpiSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  target: z.number().min(0),
  unit: z.string().optional(),
  currentValue: z.number().optional(),
});

const createRiskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  probability: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  mitigation: z.string().optional(),
  contingency: z.string().optional(),
  owner: z.string().optional(),
});

const createIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedTo: z.string().optional(),
});

const approveSchema = z.object({
  approverId: z.string().optional(),
  approverName: z.string().optional(),
  comments: z.string().optional(),
  digitalSignature: z.string().optional(),
  status: z.enum(['APPROVED', 'REJECTED', 'RETURNED']),
});

const createExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().optional(),
  expenseDate: z.string().optional(),
  fundingSource: z.string().optional(),
  budgetLineId: z.string().optional(),
  budgetLineLabel: z.string().optional(),
  receiptNumber: z.string().optional(),
});

const createReviewSchema = z.object({
  reviewType: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  periodQuarter: z.number().int().min(1).max(4).optional(),
  planned: z.string().optional(),
  completed: z.string().optional(),
  delayed: z.string().optional(),
  reason: z.string().optional(),
  corrective: z.string().optional(),
  newDeadline: z.string().optional(),
  responsible: z.string().optional(),
});

export class ActionPlanController {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const analytics = await actionPlanService.getDashboardAnalytics(orgId);

      const tenant = await (await import('../services/tenant.service')).tenantService.getByOrganizationId(orgId);

      res.json({
        success: true,
        data: {
          organizationId: orgId,
          organizationName: tenant.organizationName,
          status: tenant.status,
          ...analytics,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async constants(_req: AuthenticatedRequest, res: Response) {
    res.json({
      success: true,
      data: {
        planStatuses: PLAN_STATUSES,
        priorities: PRIORITIES,
        expenseCategories: EXPENSE_CATEGORIES,
        resourceTypes: RESOURCE_TYPES,
        templateTypes: TEMPLATE_TYPES,
      },
    });
  }

  // === Action Plans CRUD ===

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const result = await actionPlanService.list(orgId, {
        status: qs(req, 'status'),
        priority: qs(req, 'priority'),
        categoryId: qs(req, 'categoryId'),
        department: qs(req, 'department'),
        search: qs(req, 'search'),
        onDate: qs(req, 'onDate'),
        dateFrom: qs(req, 'dateFrom'),
        dateTo: qs(req, 'dateTo'),
        page: qs(req, 'page') ? parseInt(qs(req, 'page')!) : undefined,
        limit: qs(req, 'limit') ? parseInt(qs(req, 'limit')!) : undefined,
        sortBy: qs(req, 'sortBy'),
        sortOrder: qs(req, 'sortOrder') as 'asc' | 'desc',
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const plan = await actionPlanService.findById(orgId, ps(req, 'id'));
      res.json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = createPlanSchema.parse(req.body);
      const plan = await actionPlanService.create(orgId, data, req.user?.sub);
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = createPlanSchema.partial().parse(req.body);
      const plan = await actionPlanService.update(orgId, ps(req, 'id'), data, req.user?.sub);
      res.json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      await actionPlanService.delete(orgId, ps(req, 'id'), req.user?.sub);
      res.json({ success: true, message: 'Action plan deleted' });
    } catch (error) {
      next(error);
    }
  }

  // === Approvals ===

  async submitForApproval(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      await actionPlanService.submitForApproval(orgId, ps(req, 'id'), req.user?.sub);
      res.json({ success: true, message: 'Submitted for approval' });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = approveSchema.parse(req.body);
      const level = parseInt(ps(req, 'level'));
      await actionPlanService.approve(orgId, ps(req, 'id'), level, data, req.user?.sub);
      res.json({ success: true, message: `Level ${level} ${data.status.toLowerCase()}` });
    } catch (error) {
      next(error);
    }
  }

  // === Tasks ===

  async listTasks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const tasks = await actionPlanService.listTasks(orgId, qs(req, 'actionPlanId'));
      res.json({ success: true, data: tasks });
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = createTaskSchema.parse(req.body);
      const task = await actionPlanService.createTask(orgId, ps(req, 'actionPlanId'), data, req.user?.sub);
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = updateTaskSchema.parse(req.body);
      const task = await actionPlanService.updateTask(orgId, ps(req, 'id'), data, req.user?.sub);
      res.json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      await actionPlanService.deleteTask(orgId, ps(req, 'id'), req.user?.sub);
      res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
      next(error);
    }
  }

  async createDependency(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const dep = await actionPlanService.createDependency(orgId, req.body);
      res.status(201).json({ success: true, data: dep });
    } catch (error) {
      next(error);
    }
  }

  // === Comments ===

  async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const comment = await actionPlanService.addComment(orgId, ps(req, 'actionPlanId'), {
        ...req.body,
        author: req.user?.email,
      });
      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      next(error);
    }
  }

  // === Milestones ===

  async createMilestone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = createMilestoneSchema.parse(req.body);
      const milestone = await actionPlanService.createMilestone(orgId, ps(req, 'actionPlanId'), data);
      res.status(201).json({ success: true, data: milestone });
    } catch (error) {
      next(error);
    }
  }

  async updateMilestone(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const milestone = await actionPlanService.updateMilestone(orgId, ps(req, 'id'), req.body);
      res.json({ success: true, data: milestone });
    } catch (error) {
      next(error);
    }
  }

  // === Budget ===

  async upsertBudget(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const budget = await actionPlanService.createOrUpdateBudget(orgId, ps(req, 'actionPlanId'), req.body);
      res.json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }

  async budgetLines(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const token = req.headers.authorization?.slice(7);
      const lines = await fetchBudgetLines(orgId, token);
      res.json({ success: true, data: lines });
    } catch (error) {
      next(error);
    }
  }

  // === Expenses ===

  async listExpenses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = await actionPlanService.listExpenses(orgId, ps(req, 'actionPlanId'));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const planId = ps(req, 'actionPlanId');
      const body = createExpenseSchema.parse(req.body);
      const expense = await actionPlanService.createExpense(orgId, planId, body, req.user?.sub);

      if (body.budgetLineId) {
        const token = req.headers.authorization?.slice(7);
        await recordBudgetLineUsage({
          budgetLineId: body.budgetLineId,
          amount: Number(body.amount),
          description: body.description ?? `Action plan expense ${planId}`,
          referenceId: expense.id,
          accessToken: token,
        });
      }

      res.status(201).json({ success: true, data: expense });
    } catch (error) {
      next(error);
    }
  }

  // === Risks ===

  async createRisk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = createRiskSchema.parse(req.body);
      const risk = await actionPlanService.createRisk(orgId, ps(req, 'actionPlanId'), data);
      res.status(201).json({ success: true, data: risk });
    } catch (error) {
      next(error);
    }
  }

  async updateRisk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const risk = await actionPlanService.updateRisk(orgId, ps(req, 'id'), req.body);
      res.json({ success: true, data: risk });
    } catch (error) {
      next(error);
    }
  }

  // === Issues ===

  async createIssue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = createIssueSchema.parse(req.body);
      const issue = await actionPlanService.createIssue(orgId, ps(req, 'actionPlanId'), data, req.user?.sub);
      res.status(201).json({ success: true, data: issue });
    } catch (error) {
      next(error);
    }
  }

  async resolveIssue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const issue = await actionPlanService.resolveIssue(orgId, ps(req, 'id'), req.body.resolution);
      res.json({ success: true, data: issue });
    } catch (error) {
      next(error);
    }
  }

  // === KPIs ===

  async createKpi(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = createKpiSchema.parse(req.body);
      const kpi = await actionPlanService.createKpi(orgId, ps(req, 'actionPlanId'), data);
      res.status(201).json({ success: true, data: kpi });
    } catch (error) {
      next(error);
    }
  }

  async updateKpiValue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const kpi = await actionPlanService.updateKpiValue(orgId, ps(req, 'id'), req.body.currentValue);
      res.json({ success: true, data: kpi });
    } catch (error) {
      next(error);
    }
  }

  // === Categories ===

  async listCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const categories = await actionPlanService.listCategories(orgId);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const category = await actionPlanService.createCategory(orgId, req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async seedDefaultCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const categories = await actionPlanService.seedDefaultCategories(orgId);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async listStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const { fetchOrganizationStaff } = await import('../clients/staff.client');
      const staff = await fetchOrganizationStaff(orgId, search);
      res.json({ success: true, data: staff });
    } catch (error) {
      next(error);
    }
  }

  async getAcademicSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const { fetchOrganizationAcademicSettings } = await import('../clients/academic-settings.client');
      const settings = await fetchOrganizationAcademicSettings(orgId);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const { fetchOrganizationProfile } = await import('../clients/organization-profile.client');
      const profile = await fetchOrganizationProfile(orgId);
      const tenant = await (await import('../services/tenant.service')).tenantService.getByOrganizationId(orgId);
      res.json({
        success: true,
        data: profile
          ? { ...profile, schoolName: profile.schoolName || tenant.organizationName }
          : {
              organizationId: orgId,
              organizationCode: tenant.organizationCode ?? null,
              schoolName: tenant.organizationName,
              email: null,
              phone: null,
              poBox: null,
              website: null,
              address: null,
              country: 'Rwanda',
              province: null,
              district: null,
              sector: null,
              cell: null,
              village: null,
              logoUrl: null,
              signatureUrl: null,
              stampUrl: null,
              ownershipType: null,
              schoolCategory: null,
              schoolProgram: null,
              educationLevels: [],
              academicYear: null,
              curriculum: null,
              schoolMotto: null,
              description: null,
              schoolShift: null,
              principalName: null,
              deputyHeadName: null,
              bursarName: null,
              secretaryName: null,
              leadershipPhone: null,
              leadershipEmail: null,
            },
      });
    } catch (error) {
      next(error);
    }
  }

  // === Notifications ===

  async listNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const notifications = await actionPlanService.listNotifications(orgId, req.user?.sub);
      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await actionPlanService.markNotificationRead(req.organizationRef!, ps(req, 'id'));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // === Activities ===

  async listActivities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const activities = await actionPlanService.listActivities(orgId, {
        entityType: qs(req, 'entityType'),
        entityId: qs(req, 'entityId'),
        limit: qs(req, 'limit') ? parseInt(qs(req, 'limit')!) : undefined,
      });
      res.json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  }

  // === Templates ===

  async listTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const templates = await actionPlanService.listTemplates(orgId, {
        categoryId: qs(req, 'categoryId'),
        ownership: qs(req, 'ownership'),
        search: qs(req, 'search'),
        userId: req.user?.sub,
      });
      res.json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  }

  async getTemplateCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const catalog = await actionPlanService.getTemplateCatalog(orgId);
      res.json({ success: true, data: catalog });
    } catch (error) {
      next(error);
    }
  }

  async getRecommendedTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const recommendations = await actionPlanService.getRecommendedTemplates(orgId, req.user?.sub);
      res.json({ success: true, data: recommendations });
    } catch (error) {
      next(error);
    }
  }

  async getTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const template = await actionPlanService.getTemplateById(orgId, ps(req, 'id'));
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const template = await actionPlanService.createTemplate(orgId, req.body, req.user?.sub);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async updateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const template = await actionPlanService.updateTemplate(orgId, ps(req, 'id'), req.body, req.user?.sub);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async createTemplateFromPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const template = await actionPlanService.createTemplateFromPlan(
        orgId,
        ps(req, 'planId'),
        req.body,
        req.user?.sub
      );
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async applyTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const plan = await actionPlanService.applyTemplate(orgId, ps(req, 'id'), req.body, req.user?.sub);
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      await actionPlanService.deleteTemplate(orgId, ps(req, 'id'), req.user?.sub);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async seedOfficialTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const templates = await actionPlanService.seedOfficialTemplates(orgId);
      res.json({ success: true, data: { seeded: templates.length } });
    } catch (error) {
      next(error);
    }
  }

  // === Meetings ===

  async listMeetings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const meetings = await actionPlanService.listMeetings(orgId, qs(req, 'actionPlanId'));
      res.json({ success: true, data: meetings });
    } catch (error) {
      next(error);
    }
  }

  async createMeeting(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const meeting = await actionPlanService.createMeeting(orgId, req.body, req.user?.sub);
      res.status(201).json({ success: true, data: meeting });
    } catch (error) {
      next(error);
    }
  }

  async addMeetingMinute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const minute = await actionPlanService.addMeetingMinute(orgId, ps(req, 'meetingId'), req.body);
      res.status(201).json({ success: true, data: minute });
    } catch (error) {
      next(error);
    }
  }

  // === Recurring Plans ===

  async createRecurringPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const plan = await actionPlanService.createRecurringPlan(orgId, req.body, req.user?.sub);
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  // === Resources ===

  async createResourceAllocation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const allocation = await actionPlanService.createResourceAllocation(orgId, ps(req, 'actionPlanId'), req.body);
      res.status(201).json({ success: true, data: allocation });
    } catch (error) {
      next(error);
    }
  }

  // === Attachments / Evidence ===

  async uploadAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const planId = ps(req, 'actionPlanId');
      const file = req.file;
      if (!file) throw new Error('No file uploaded');

      const category = typeof req.body?.category === 'string' ? req.body.category : 'other';
      const taskId = typeof req.body?.taskId === 'string' ? req.body.taskId : undefined;
      const relPath = publicUploadPath(orgId, planId, file.filename);

      const attachment = await actionPlanService.addAttachment(orgId, planId, {
        taskId,
        filename: file.filename,
        originalName: file.originalname,
        filePath: relPath,
        mimeType: file.mimetype,
        fileSize: file.size,
        category,
        uploadedBy: req.user?.email ?? req.user?.sub,
      });
      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      next(error);
    }
  }

  async verifyAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const attachment = await actionPlanService.verifyAttachment(
        orgId,
        ps(req, 'id'),
        req.user?.email ?? req.user?.sub ?? 'Verifier'
      );
      res.json({ success: true, data: attachment });
    } catch (error) {
      next(error);
    }
  }

  async deleteAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      await actionPlanService.deleteAttachment(orgId, ps(req, 'id'));
      res.json({ success: true, message: 'Attachment deleted' });
    } catch (error) {
      next(error);
    }
  }

  // === Budget integration ===

  // === Period reviews ===

  async listReviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const reviewType = qs(req, 'reviewType');
      const data = await actionPlanService.listPeriodReviews(orgId, reviewType);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const data = createReviewSchema.parse(req.body);
      const review = await actionPlanService.createPeriodReview(orgId, data, req.user?.sub);
      res.status(201).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }

  async permissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      res.json({
        success: true,
        data: {
          roles: getUserApRoles(user),
          primaryRole: primaryRoleLabel(user),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async syncNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const result = await actionPlanService.syncOverdueNotifications(orgId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const actionPlanController = new ActionPlanController();
