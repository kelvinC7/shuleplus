import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { formatStaffNumber } from '../constants/payroll.constants';
import { AppError } from '../middleware/error.middleware';
import { pushStaffToHr } from './staff-sync-push';

export interface ImportRow {
  rowNumber: number;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  rssbNumber?: string;
  department?: string;
  position?: string;
  contractType?: string;
  hireDate?: string;
  contractEnd?: string;
  basicSalary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  paymentMethod?: string;
  transportAllowance?: number;
  housingAllowance?: number;
  othersAllowance?: number;
  [key: string]: unknown;
}

export interface ImportOptions {
  dryRun?: boolean;
  updateExisting?: boolean;
  deleteAndReimport?: boolean;
  skipRowNumbers?: number[];
}

export interface ImportResult {
  total: number;
  ready: number;
  incomplete: number;
  duplicate: number;
  willUpdate: number;
  importable: number;
  created?: number;
  updated?: number;
  failed?: number;
  skippedProtected?: number;
  errors?: { rowNumber: number; message: string }[];
  failedRows?: ImportRow[];
}

function normalizeGender(value?: string): string {
  const v = (value ?? '').trim().toUpperCase();
  if (v.startsWith('F')) return 'FEMALE';
  if (v.startsWith('M')) return 'MALE';
  return 'OTHER';
}

function parseSalary(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function rowKey(row: ImportRow): string | null {
  return row.nationalId?.trim() || row.rssbNumber?.trim() || row.email?.trim().toLowerCase() || row.phone?.trim() || null;
}

export class StaffImportService {
  validateRows(
    rows: ImportRow[],
    existingStaff: {
      id: string;
      nationalId: string | null;
      rssbNumber: string | null;
      email: string | null;
      phone: string | null;
      isProtected: boolean;
      position: string | null;
      firstName: string;
      lastName: string;
    }[]
  ) {
    const seen = new Map<string, number>();
    const enriched = rows.map((row) => {
      const missing: string[] = [];
      if (!row.firstName?.trim()) missing.push('First Name');
      if (!row.lastName?.trim()) missing.push('Last Name');
      if (!row.gender?.trim()) missing.push('Gender');
      if (!row.nationalId?.trim() && !row.rssbNumber?.trim()) {
        missing.push('National ID or RSSB');
      }

      const optionalMissing: string[] = [];
      if (!row.phone?.trim()) optionalMissing.push('Phone');
      if (!row.email?.trim()) optionalMissing.push('Email');
      if (!row.basicSalary) optionalMissing.push('Basic Salary');

      let status: 'ready' | 'incomplete' | 'duplicate' | 'willUpdate' = missing.length ? 'incomplete' : 'ready';
      let duplicateOf: number | null = null;
      let existingId: string | null = null;

      const key = rowKey(row);
      if (key) {
        if (seen.has(key)) {
          status = 'duplicate';
          duplicateOf = seen.get(key)!;
        } else {
          seen.set(key, row.rowNumber);
        }

        const match = existingStaff.find((e) =>
          (row.nationalId && e.nationalId === row.nationalId.trim()) ||
          (row.rssbNumber && e.rssbNumber === row.rssbNumber.trim()) ||
          (row.email && e.email?.toLowerCase() === row.email.trim().toLowerCase()) ||
          (row.phone && e.phone === row.phone.trim())
        );
        if (match && status !== 'duplicate') {
          status = 'willUpdate';
          existingId = match.id;
        }
      }

      return { ...row, status, missing, optionalMissing, duplicateOf, existingId };
    });

    const stats: ImportResult = {
      total: rows.length,
      ready: enriched.filter((r) => r.status === 'ready').length,
      incomplete: enriched.filter((r) => r.status === 'incomplete').length,
      duplicate: enriched.filter((r) => r.status === 'duplicate').length,
      willUpdate: enriched.filter((r) => r.status === 'willUpdate').length,
      importable: enriched.filter((r) => r.status === 'ready' || r.status === 'willUpdate' || r.status === 'incomplete').length,
    };

    return { rows: enriched, stats };
  }

  async importRows(orgId: string, rows: ImportRow[], options: ImportOptions = {}): Promise<ImportResult> {
    const skip = new Set(options.skipRowNumbers ?? []);
    const existing = await prisma.payrollStaff.findMany({
      where: { organizationId: orgId, deletedAt: null },
    });

    const { rows: validated, stats } = this.validateRows(rows, existing);
    const result: ImportResult = { ...stats, created: 0, updated: 0, failed: 0, errors: [], failedRows: [] };

    if (options.dryRun) return result;

    let seq = await prisma.payrollStaff.count({ where: { organizationId: orgId } });

    for (const row of validated) {
      if (skip.has(row.rowNumber) || row.status === 'duplicate') continue;
      if (row.status === 'incomplete' && (!row.firstName || !row.lastName || !row.gender)) {
        result.failed! += 1;
        result.errors!.push({ rowNumber: row.rowNumber, message: 'Missing required fields' });
        result.failedRows!.push(row);
        continue;
      }

      try {
        const staffPayload = {
          firstName: String(row.firstName).trim(),
          lastName: String(row.lastName).trim(),
          gender: normalizeGender(row.gender),
          dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : new Date('1990-01-01'),
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || '+250000000000',
          nationalId: row.nationalId?.trim() || null,
          rssbNumber: row.rssbNumber?.trim() || null,
          department: row.department?.trim() || null,
          position: row.position?.trim() || 'Staff',
          hireDate: row.hireDate ? new Date(row.hireDate) : new Date(),
          bankName: row.bankName?.trim() || null,
          bankAccount: row.bankAccountNumber?.trim() || null,
          status: 'ACTIVE' as const,
          isActive: true,
          hrProfile: {
            contractType: row.contractType?.trim() || 'PERMANENT',
            paymentMethod: row.paymentMethod?.trim() || null,
            middleName: row.middleName?.trim() || null,
          } as Prisma.InputJsonValue,
        };

        const salary = parseSalary(row.basicSalary) ?? 0;
        const profilePayload = {
          basicSalary: salary,
          transportAllowance: row.transportAllowance ?? 0,
          housingAllowance: row.housingAllowance ?? 0,
          othersAllowance: row.othersAllowance ?? 0,
        };

        if (row.existingId && (options.updateExisting || options.deleteAndReimport)) {
          if (options.deleteAndReimport) {
            const existingStaff = existing.find((e) => e.id === row.existingId);
            if (existingStaff?.isProtected) {
              result.failed! += 1;
              result.errors!.push({ rowNumber: row.rowNumber, message: 'Cannot delete protected employee' });
              continue;
            }
            await prisma.payrollStaff.update({
              where: { id: row.existingId },
              data: { deletedAt: new Date(), status: 'TERMINATED', isActive: false },
            });
            seq += 1;
            const created = await prisma.payrollStaff.create({
              data: {
                organizationId: orgId,
                employeeNumber: formatStaffNumber(seq),
                ...staffPayload,
              },
            });
            await prisma.staffPayrollProfile.create({
              data: { organizationId: orgId, staffId: created.id, ...profilePayload },
            });
            result.created! += 1;
            void pushStaffToHr(orgId, created.id).catch((err) =>
              console.warn('[Payroll Import] HR sync failed:', err)
            );
          } else {
            await prisma.payrollStaff.update({ where: { id: row.existingId }, data: staffPayload });
            await prisma.staffPayrollProfile.upsert({
              where: { staffId: row.existingId },
              create: { organizationId: orgId, staffId: row.existingId, ...profilePayload },
              update: profilePayload,
            });
            result.updated! += 1;
            void pushStaffToHr(orgId, row.existingId).catch((err) =>
              console.warn('[Payroll Import] HR sync failed:', err)
            );
          }
        } else if (row.existingId && options.updateExisting !== false) {
          await prisma.payrollStaff.update({ where: { id: row.existingId }, data: staffPayload });
          await prisma.staffPayrollProfile.upsert({
            where: { staffId: row.existingId },
            create: { organizationId: orgId, staffId: row.existingId, ...profilePayload },
            update: profilePayload,
          });
          result.updated! += 1;
          void pushStaffToHr(orgId, row.existingId).catch((err) =>
            console.warn('[Payroll Import] HR sync failed:', err)
          );
        } else if (!row.existingId) {
          seq += 1;
          const created = await prisma.payrollStaff.create({
            data: {
              organizationId: orgId,
              employeeNumber: formatStaffNumber(seq),
              ...staffPayload,
            },
          });
          await prisma.staffPayrollProfile.create({
            data: { organizationId: orgId, staffId: created.id, ...profilePayload },
          });
          result.created! += 1;
          void pushStaffToHr(orgId, created.id).catch((err) =>
            console.warn('[Payroll Import] HR sync failed:', err)
          );
        }
      } catch (err) {
        result.failed! += 1;
        result.errors!.push({
          rowNumber: row.rowNumber,
          message: err instanceof Error ? err.message : 'Import failed',
        });
        result.failedRows!.push(row);
      }
    }

    return result;
  }

  async deleteExistingForReimport(orgId: string, staffIds: string[]) {
    const protectedCount = await prisma.payrollStaff.count({
      where: { organizationId: orgId, id: { in: staffIds }, isProtected: true },
    });
    if (protectedCount > 0) {
      throw new AppError(400, 'Cannot delete protected employees');
    }
    await prisma.payrollStaff.updateMany({
      where: { organizationId: orgId, id: { in: staffIds }, isProtected: false },
      data: { deletedAt: new Date(), status: 'TERMINATED', isActive: false },
    });
    return { deleted: staffIds.length - protectedCount, skippedProtected: protectedCount };
  }
}

export const staffImportService = new StaffImportService();
