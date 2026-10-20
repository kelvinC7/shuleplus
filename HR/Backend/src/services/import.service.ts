import { ContractType, Gender, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { allocateHrEmployeeNumber } from '../utils/staff-id';
import { AppError } from '../middleware/error.middleware';
import { pushEmployeeToPayroll } from './employee-sync-push';

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

function normalizeGender(value?: string): Gender {
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

function normalizeContractType(value?: string): ContractType {
  const v = (value ?? 'PERMANENT').toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, ContractType> = {
    PERMANENT: 'PERMANENT',
    CONTRACT: 'CONTRACT',
    TEMPORARY: 'TEMPORARY',
    PROBATION: 'PROBATION',
    INTERNSHIP: 'INTERNSHIP',
    PART_TIME: 'PART_TIME',
    'PART-TIME': 'PART_TIME',
    CONSULTANCY: 'CONSULTANCY',
  };
  return map[v] ?? 'PERMANENT';
}

function rowKey(row: ImportRow): string | null {
  return row.nationalId?.trim() || row.rssbNumber?.trim() || row.email?.trim().toLowerCase() || row.phone?.trim() || null;
}

export class ImportService {
  validateRows(rows: ImportRow[], existingEmployees: { id: string; nationalId: string | null; email: string | null; phone: string; hrProfile: unknown; isProtected: boolean; position: string; firstName: string; lastName: string }[]) {
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

        const match = existingEmployees.find((e) => {
          const profile = (e.hrProfile ?? {}) as Record<string, string>;
          return (
            (row.nationalId && e.nationalId === row.nationalId.trim()) ||
            (row.rssbNumber && profile.rssbNumber === row.rssbNumber.trim()) ||
            (row.email && e.email?.toLowerCase() === row.email.trim().toLowerCase()) ||
            (row.phone && e.phone === row.phone.trim())
          );
        });
        if (match && status !== 'duplicate') {
          status = 'willUpdate';
          existingId = match.id;
        }
      }

      return {
        ...row,
        status,
        missing,
        optionalMissing,
        duplicateOf,
        existingId,
      };
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
    const existing = await prisma.employee.findMany({
      where: { organizationId: orgId, deletedAt: null },
    });

    const { rows: validated, stats } = this.validateRows(rows, existing);
    const result: ImportResult = { ...stats, created: 0, updated: 0, failed: 0, errors: [], failedRows: [] };

    if (options.dryRun) return result;

    const departments = await prisma.department.findMany({ where: { organizationId: orgId } });
    const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
    const tenant = await prisma.tenant.findUnique({ where: { organizationId: orgId } });

    for (const row of validated) {
      if (skip.has(row.rowNumber) || row.status === 'duplicate') continue;
      if (row.status === 'incomplete' && (!row.firstName || !row.lastName || !row.gender)) {
        result.failed! += 1;
        result.errors!.push({ rowNumber: row.rowNumber, message: 'Missing required fields' });
        result.failedRows!.push(row);
        continue;
      }

      try {
        const departmentId = row.department
          ? deptByName.get(row.department.toLowerCase()) ?? null
          : null;

        const payload = {
          firstName: String(row.firstName).trim(),
          middleName: row.middleName?.trim() || null,
          lastName: String(row.lastName).trim(),
          gender: normalizeGender(row.gender),
          dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : new Date('1990-01-01'),
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || '+250000000000',
          nationalId: row.nationalId?.trim() || null,
          departmentId,
          position: row.position?.trim() || 'Staff',
          contractType: normalizeContractType(row.contractType),
          hireDate: row.hireDate ? new Date(row.hireDate) : new Date(),
          contractEnd: row.contractEnd ? new Date(row.contractEnd) : null,
          ongoingContract: !row.contractEnd,
          basicSalary: parseSalary(row.basicSalary),
          hrProfile: {
            rssbNumber: row.rssbNumber?.trim() || null,
            bank: {
              bankName: row.bankName?.trim() || null,
              accountNumber: row.bankAccountNumber?.trim() || null,
            },
            paymentMethod: row.paymentMethod?.trim() || null,
            allowances: {
              transport: row.transportAllowance ?? null,
              housing: row.housingAllowance ?? null,
              others: row.othersAllowance ?? null,
            },
          } as Prisma.InputJsonValue,
        };

        if (row.existingId && (options.updateExisting || options.deleteAndReimport)) {
          if (options.deleteAndReimport) {
            const existingEmp = existing.find((e) => e.id === row.existingId);
            if (existingEmp?.isProtected) {
              result.failed! += 1;
              result.errors!.push({ rowNumber: row.rowNumber, message: 'Cannot delete protected employee' });
              continue;
            }
            await prisma.employee.update({
              where: { id: row.existingId },
              data: { deletedAt: new Date(), status: 'TERMINATED' },
            });
            const recreated = await prisma.employee.create({
              data: {
                organizationId: orgId,
                employeeNumber: await allocateHrEmployeeNumber(
                  orgId,
                  payload.position,
                  tenant?.organizationCode
                ),
                ...payload,
                status: 'ACTIVE',
              },
            });
            result.created! += 1;
            void pushEmployeeToPayroll(orgId, recreated.id).catch((err) =>
              console.warn('[HR Import] Payroll sync failed:', err)
            );
          } else {
            await prisma.employee.update({
              where: { id: row.existingId },
              data: payload,
            });
            result.updated! += 1;
            void pushEmployeeToPayroll(orgId, row.existingId).catch((err) =>
              console.warn('[HR Import] Payroll sync failed:', err)
            );
          }
        } else if (row.existingId && options.updateExisting !== false) {
          await prisma.employee.update({ where: { id: row.existingId }, data: payload });
          result.updated! += 1;
          void pushEmployeeToPayroll(orgId, row.existingId).catch((err) =>
            console.warn('[HR Import] Payroll sync failed:', err)
          );
        } else if (!row.existingId) {
          const created = await prisma.employee.create({
            data: {
              organizationId: orgId,
              employeeNumber: await allocateHrEmployeeNumber(
                orgId,
                payload.position,
                tenant?.organizationCode
              ),
              ...payload,
              status: 'ACTIVE',
            },
          });
          result.created! += 1;
          void pushEmployeeToPayroll(orgId, created.id).catch((err) =>
            console.warn('[HR Import] Payroll sync failed:', err)
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

  async deleteExistingForReimport(orgId: string, employeeIds: string[]) {
    const protectedCount = await prisma.employee.count({
      where: { organizationId: orgId, id: { in: employeeIds }, isProtected: true },
    });
    if (protectedCount > 0) {
      throw new AppError(400, 'Cannot delete protected employees (Organization Administrator / School Manager)');
    }
    await prisma.employee.updateMany({
      where: { organizationId: orgId, id: { in: employeeIds }, isProtected: false },
      data: { deletedAt: new Date(), status: 'TERMINATED' },
    });
    return { deleted: employeeIds.length - protectedCount, skippedProtected: protectedCount };
  }
}

export const importService = new ImportService();
