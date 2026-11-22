import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { listLinkedStudents, resolveParentContext } from './parent-context.service';
import { parseStudentSelector, type StudentSelector } from '../utils/student-param';
import { enrichSchoolTrip, enrichSchoolTrips } from '../lib/trip-enrichment';
import { recordShuleTripGuardianConsent } from '../clients/shule-trip.client';
import { phonesMatch } from './trip-guardian-provision.service';
import { manifestStudentKeysForPhone } from './manifest-guardian-scope.service';
import { isParentShuleTripOnly } from './parent-portal-mode.service';
import type {
  TripDocumentMeta,
  TripGalleryItem,
  TripLiveUpdate,
  TripNotificationPrefs,
} from '../lib/trip-enrichment';

export interface SchoolTrip {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  reference?: string;
  purpose?: string;
  place: string;
  date: string;
  short: string;
  depart: string;
  ret: string;
  departAtIso?: string | null;
  returnAtIso?: string | null;
  cost: number;
  paid: number;
  inst: number;
  due: string;
  day: number;
  teacher: string;
  ph: string;
  guardianEmail?: string;
  schoolPhone?: string;
  plan: Array<[string, string]>;
  pack: string[];
  consent?: {
    by: string;
    at: string;
    atIso?: string;
    status?: 'approved' | 'declined';
    confirmations?: { read?: boolean; approve?: boolean; emergency?: boolean };
  };
  documents?: TripDocumentMeta[];
  gallery?: TripGalleryItem[];
  liveUpdates?: TripLiveUpdate[];
  notifications?: TripNotificationPrefs;
  mediaPublished?: boolean;
}

export interface SavingsGoal {
  id: string;
  studentId: string;
  studentName: string;
  name: string;
  target: number;
  saved: number;
  weekly: number;
  by: string;
  auto: boolean;
}

export interface SpendLimits {
  on: boolean;
  period: 'day' | 'week' | 'term';
  amount: number;
  alert: boolean;
  block: boolean;
}

function tripMatchesStudent(trip: SchoolTrip, studentId: string, shuleCode: string | null | undefined) {
  const sid = String(trip.studentId ?? '').trim();
  if (!sid) return false;
  const keys = new Set([studentId, shuleCode].filter(Boolean));
  return keys.has(sid);
}

function tripMatchesGuardianPhone(trip: SchoolTrip, parentPhone: string | null | undefined) {
  if (!parentPhone?.trim() || !trip.ph?.trim()) return false;
  return phonesMatch(trip.ph, parentPhone);
}

export class TripsGoalsService {
  async getTrips(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const requested = parseStudentSelector(requestedStudentId);
    const filterOneChild = Boolean(requested.id || requested.code);
    const ctx = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const student = await prisma.student.findUnique({ where: { id: ctx.studentId } });
    const parent = await prisma.parentAccount.findUnique({ where: { id: parentId } });
    const linked = await listLinkedStudents(parentId, organizationId);

    const orgIds = new Set<string>([ctx.organizationId, organizationId]);
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId },
      include: { student: { select: { organizationId: true } } },
    });
    for (const link of links) {
      if (link.student.organizationId) orgIds.add(link.student.organizationId);
    }

    if (parent && (await isParentShuleTripOnly(organizationId, parentId))) {
      const allTripSettings = await prisma.setting.findMany({
        where: { key: { startsWith: 'trips:' } },
        select: { organizationId: true },
      });
      for (const row of allTripSettings) orgIds.add(row.organizationId);
    }

    const manifestKeys = parent?.phone ? await manifestStudentKeysForPhone(parent.phone) : new Set<string>();

    const merged = new Map<string, SchoolTrip>();
    for (const orgId of orgIds) {
      const key = `trips:${orgId}`;
      const setting = await prisma.setting.findUnique({
        where: { organizationId_key: { organizationId: orgId, key } },
      });
      if (!setting?.value) continue;
      try {
        const rows = JSON.parse(setting.value) as SchoolTrip[];
        for (const trip of rows) {
          merged.set(`${trip.id}:${trip.studentId}`, trip);
        }
      } catch {
        /* ignore corrupt setting */
      }
    }

    const trips = [...merged.values()];
    let scoped = trips.filter((t) => {
      if (!tripMatchesGuardianPhone(t, parent?.phone)) return false;
      const sid = String(t.studentId ?? '').trim();
      if (sid && manifestKeys.has(sid)) return true;
      return linked.some((l) => tripMatchesStudent(t, l.id, l.shuleCode));
    });

    if (filterOneChild) {
      scoped = scoped.filter((t) => tripMatchesStudent(t, ctx.studentId, student?.shuleCode));
    }

    return enrichSchoolTrips(scoped);
  }

  private async locateTripRecord(
    organizationId: string,
    parentId: string,
    tripId: string
  ): Promise<{ orgId: string; key: string; trips: SchoolTrip[]; trip: SchoolTrip }> {
    const ctx = await resolveParentContext(organizationId, parentId);
    const orgIds = new Set<string>([ctx.organizationId, organizationId]);
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId },
      include: { student: { select: { organizationId: true } } },
    });
    for (const link of links) {
      if (link.student.organizationId) orgIds.add(link.student.organizationId);
    }

    for (const orgId of orgIds) {
      const key = `trips:${orgId}`;
      const setting = await prisma.setting.findUnique({
        where: { organizationId_key: { organizationId: orgId, key } },
      });
      if (!setting?.value) continue;
      const trips: SchoolTrip[] = JSON.parse(setting.value);
      const trip = trips.find((t) => t.id === tripId);
      if (trip) return { orgId, key, trips, trip };
    }
    throw new AppError(404, 'Trip not found');
  }

  async submitTripConsent(
    organizationId: string,
    parentId: string,
    tripId: string,
    parentName: string,
    payload?: {
      declined?: boolean;
      confirmations?: { read?: boolean; approve?: boolean; emergency?: boolean };
    },
    guardianPhone?: string | null
  ) {
    const { orgId, key, trips, trip } = await this.locateTripRecord(organizationId, parentId, tripId);

    const atIso = new Date().toISOString();
    const declined = Boolean(payload?.declined);
    trip.consent = {
      by: parentName,
      at: new Date().toLocaleDateString('en-GB'),
      atIso,
      status: declined ? 'declined' : 'approved',
      confirmations: payload?.confirmations,
    };
    await prisma.setting.update({
      where: { organizationId_key: { organizationId: orgId, key } },
      data: { value: JSON.stringify(trips) },
    });

    if (trip.studentId && guardianPhone?.trim()) {
      try {
        await recordShuleTripGuardianConsent({
          organizationId: orgId,
          tripId,
          studentId: trip.studentId,
          guardianPhone: guardianPhone.trim(),
          approved: !declined,
        });
      } catch (err) {
        console.warn('[ParentMIS] ShuleTrip consent sync:', err instanceof Error ? err.message : err);
      }
    }

    return enrichSchoolTrip(trip);
  }

  async payTripFee(
    organizationId: string,
    parentId: string,
    tripId: string,
    amount: number
  ) {
    const key = `trips:${organizationId}`;
    const setting = await prisma.setting.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
    if (!setting) throw new AppError(404, 'Trips not found');

    const trips: SchoolTrip[] = JSON.parse(setting.value);
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) throw new AppError(404, 'Trip not found');

    trip.paid = Math.min(trip.cost, trip.paid + amount);
    await prisma.setting.update({
      where: { organizationId_key: { organizationId, key } },
      data: { value: JSON.stringify(trips) },
    });

    return trip;
  }

  async getGoals(organizationId: string, parentId: string) {
    const key = `goals:${parentId}`;
    const setting = await prisma.setting.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });

    if (!setting) {
      const defaultGoals: SavingsGoal[] = [
        {
          id: 'g-s4tour',
          studentId: 'default',
          studentName: 'Kevin Uwase',
          name: 'S4 Study Tour · Akagera 2027',
          target: 120000,
          saved: 36000,
          weekly: 5000,
          by: 'June 2027',
          auto: true,
        },
        {
          id: 'g-shulekit',
          studentId: 'default',
          studentName: 'Emely Uwase',
          name: 'Term 1 2027 ShuleKit Fund',
          target: 65000,
          saved: 25000,
          weekly: 5000,
          by: 'January 2027',
          auto: false,
        },
      ];
      await prisma.setting.createMany({
        data: [{ organizationId, key, value: JSON.stringify(defaultGoals) }],
        skipDuplicates: true,
      });
      const seeded = await prisma.setting.findUnique({
        where: { organizationId_key: { organizationId, key } },
      });
      if (seeded) {
        try {
          return JSON.parse(seeded.value) as SavingsGoal[];
        } catch {
          return defaultGoals;
        }
      }
      return defaultGoals;
    }

    try {
      return JSON.parse(setting.value) as SavingsGoal[];
    } catch {
      return [];
    }
  }

  async createGoal(organizationId: string, parentId: string, goal: Omit<SavingsGoal, 'id'>) {
    const goals = await this.getGoals(organizationId, parentId);
    const newGoal: SavingsGoal = {
      ...goal,
      id: 'g-' + Date.now(),
      saved: goal.saved || 0,
    };
    goals.push(newGoal);

    await prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key: `goals:${parentId}` } },
      create: { organizationId, key: `goals:${parentId}`, value: JSON.stringify(goals) },
      update: { value: JSON.stringify(goals) },
    });

    return newGoal;
  }

  async topUpGoal(organizationId: string, parentId: string, goalId: string, amount: number) {
    const goals = await this.getGoals(organizationId, parentId);
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) throw new AppError(404, 'Savings goal not found');

    goal.saved = Math.min(goal.target, goal.saved + amount);

    await prisma.setting.update({
      where: { organizationId_key: { organizationId, key: `goals:${parentId}` } },
      data: { value: JSON.stringify(goals) },
    });

    return goal;
  }

  async toggleGoalAutoSave(organizationId: string, parentId: string, goalId: string) {
    const goals = await this.getGoals(organizationId, parentId);
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) throw new AppError(404, 'Savings goal not found');

    goal.auto = !goal.auto;

    await prisma.setting.update({
      where: { organizationId_key: { organizationId, key: `goals:${parentId}` } },
      data: { value: JSON.stringify(goals) },
    });

    return goal;
  }

  async getWalletLimits(organizationId: string, studentId: string): Promise<SpendLimits> {
    const key = `limits:${studentId}`;
    const setting = await prisma.setting.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });

    if (setting) {
      try {
        return JSON.parse(setting.value);
      } catch {
        // fallback
      }
    }

    return {
      on: true,
      period: 'week',
      amount: 5000,
      alert: true,
      block: true,
    };
  }

  async saveWalletLimits(organizationId: string, studentId: string, limits: SpendLimits) {
    const key = `limits:${studentId}`;
    await prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value: JSON.stringify(limits) },
      update: { value: JSON.stringify(limits) },
    });
    return limits;
  }

  async requestSizeExchange(
    organizationId: string,
    orderId: string,
    payload: { item: string; oldSize: string; newSize: string }
  ) {
    const key = `exchange:${orderId}`;
    const record = {
      orderId,
      ...payload,
      status: 'PENDING_STORE_COLLECTION',
      requestedAt: new Date().toISOString(),
    };

    await prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, value: JSON.stringify(record) },
      update: { value: JSON.stringify(record) },
    });

    return record;
  }
}

export const tripsGoalsService = new TripsGoalsService();
