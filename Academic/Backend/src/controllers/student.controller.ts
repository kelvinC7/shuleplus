import { Response, NextFunction } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { studentService, type ImportRowInput } from '../services/student.service';
import { AppError } from '../middleware/error.middleware';

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  sector: z.string().optional(),
  cell: z.string().optional(),
  village: z.string().optional(),
  rfidUid: z.string().optional(),
  fingerprintId: z.string().optional(),
  studentPhoto: z.string().optional(),
  sdmCode: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  formerSchool: z.string().optional(),
  leavingReason: z.string().optional(),
  identityRemarks: z.string().optional(),
  classId: z.string().min(1, 'Class is required — select a class before enrolling the student'),
  academicYear: z.string().optional(),
  term: z.string().optional(),
  joiningDate: z.string().optional(),
  parents: z
    .array(
      z.object({
        parentId: z.string(),
        role: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
      })
    )
    .optional(),
});

const updateSchema = registerSchema.partial().extend({
  classId: z.string().min(1).optional(),
  disciplineMarks: z.number().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN']).optional(),
});

const listQuerySchema = z.object({
  classId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  academicYear: z.string().optional(),
});

const importRowSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  age: z.union([z.string(), z.number()]).optional(),
  sdmCode: z.string().optional(),
  className: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  fatherPhone: z.string().optional(),
  motherPhone: z.string().optional(),
  district: z.string().optional(),
  sector: z.string().optional(),
  cell: z.string().optional(),
  village: z.string().optional(),
  nationality: z.string().optional(),
});

const importBodySchema = z.object({
  academicYear: z.string().min(1),
  term: z.string().optional(),
  duplicateMode: z.enum(['skip', 'update']).optional(),
  importValidOnly: z.boolean().optional(),
  generateMissingSdms: z.boolean().optional(),
  rows: z.array(importRowSchema).min(1),
});

export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.includes('sheet') ||
      file.mimetype.includes('excel') ||
      file.mimetype.includes('csv') ||
      !!file.originalname.match(/\.(xlsx|xls|csv)$/i);
    if (ok) cb(null, true);
    else cb(new Error('Only Excel/CSV files are allowed'));
  },
});

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (h) => h.toLowerCase().replace(/[\s_]+/g, '') === k.toLowerCase().replace(/[\s_]+/g, '')
    );
    if (found != null && row[found] != null && String(row[found]).trim() !== '') {
      const val = row[found];
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      return String(val).trim();
    }
  }
  return '';
}

function resolveNames(row: Record<string, unknown>): { firstName: string; lastName: string } {
  let firstName = cell(row, 'firstName', 'firstname', 'first name', 'givenname', 'given name');
  let lastName = cell(row, 'lastName', 'lastname', 'last name', 'surname', 'familyname', 'family name');

  if (firstName && lastName) return { firstName, lastName };

  const full = cell(
    row,
    'names',
    'name',
    'fullName',
    'fullname',
    'studentName',
    'studentname',
    'student name',
    'pupilName',
    'pupil name'
  );

  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { firstName: firstName || parts[0], lastName: lastName || parts[0] };
    }
    return {
      firstName: firstName || parts[0],
      lastName: lastName || parts.slice(1).join(' '),
    };
  }

  if (firstName && !lastName) {
    const parts = firstName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }
  if (lastName && !firstName) {
    const parts = lastName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  return { firstName, lastName };
}

export function mapExcelRows(raw: Record<string, unknown>[]): ImportRowInput[] {
  return raw.map((r) => {
    const dobRaw = cell(r, 'dateOfBirth', 'dob', 'date of birth', 'birthdate');
    let dateOfBirth = dobRaw;
    if (dobRaw && !Number.isNaN(Date.parse(dobRaw))) {
      dateOfBirth = new Date(dobRaw).toISOString().slice(0, 10);
    }
    const { firstName, lastName } = resolveNames(r);
    return {
      firstName,
      lastName,
      gender: cell(r, 'gender', 'sex'),
      dateOfBirth: dateOfBirth || undefined,
      age: cell(r, 'age') || undefined,
      // Government code — optional, never auto-generated
      sdmCode: cell(r, 'sdmCode', 'sdms', 'sdm', 'sdmscode', 'sdms code', 'sdmsCode') || undefined,
      className: cell(r, 'className', 'class', 'classname', 'grade') || undefined,
      fatherName: cell(r, 'fatherName', 'father', 'father name') || undefined,
      motherName: cell(r, 'motherName', 'mother', 'mother name') || undefined,
      fatherPhone: cell(r, 'fatherPhone', 'father phone', 'fatherTel') || undefined,
      motherPhone: cell(r, 'motherPhone', 'mother phone', 'motherTel') || undefined,
      district: cell(r, 'district') || undefined,
      sector: cell(r, 'sector') || undefined,
      cell: cell(r, 'cell') || undefined,
      village: cell(r, 'village') || undefined,
      nationality: cell(r, 'nationality') || undefined,
    };
  });
}

export class StudentController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = registerSchema.parse(req.body);
      const data = await studentService.register(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async nextCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const data = await studentService.nextCodePreview(req.organizationRef!, academicYear);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async importPreview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = importBodySchema.pick({ academicYear: true, term: true, rows: true }).parse(req.body);
      const data = await studentService.previewImport(req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async importExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      let rows: ImportRowInput[] = [];
      let academicYear = '';
      let term: string | undefined;
      let duplicateMode: 'skip' | 'update' = 'skip';
      let importValidOnly = true;
      let generateMissingSdms = true;

      if (req.file) {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        if (!raw.length) throw new AppError(400, 'Spreadsheet has no data rows');
        rows = mapExcelRows(raw);
        academicYear = String(req.body.academicYear || '').trim();
        term = req.body.term ? String(req.body.term).trim() : undefined;
        if (req.body.duplicateMode === 'update') duplicateMode = 'update';
        if (req.body.importValidOnly === 'false' || req.body.importValidOnly === false) importValidOnly = false;
        if (req.body.generateMissingSdms === 'false' || req.body.generateMissingSdms === false) {
          generateMissingSdms = false;
        }
      } else {
        const body = importBodySchema.parse(req.body);
        rows = body.rows;
        academicYear = body.academicYear;
        term = body.term;
        duplicateMode = body.duplicateMode ?? 'skip';
        importValidOnly = body.importValidOnly !== false;
        generateMissingSdms = body.generateMissingSdms !== false;
      }

      if (!academicYear) throw new AppError(400, 'Academic year is required');
      if (!rows.length) throw new AppError(400, 'No rows to import');

      const data = await studentService.importBulk(req.organizationRef!, req.user!.sub, rows, {
        academicYear,
        term,
        duplicateMode,
        importValidOnly,
        generateMissingSdms,
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = listQuerySchema.parse(req.query);
      const data = await studentService.list(req.organizationRef!, query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await studentService.getById(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await studentService.update(req.params.id as string, req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await studentService.delete(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const studentController = new StudentController();
