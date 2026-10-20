import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import * as XLSX from 'xlsx';
import {
  previewStudentImport,
  importStudentsRows,
  type ImportPreviewRow,
  type ImportRowPayload,
  type ImportResult,
} from '@/services/api';
import { toast } from '@/lib/toast';

const AMBER = '#FCB038';
const NAVY = '#000435';

const STEPS = [
  'Academic Info',
  'Upload File',
  'Preview & Validation',
  'Duplicate Detection',
  'Confirmation',
  'Import Complete',
];

const YEAR_OPTIONS = ['2025-2026', '2026-2027', '2027-2028'];
const TERM_OPTIONS = [
  { value: '', label: 'Leave Empty' },
  { value: 'Term I', label: 'Term I' },
  { value: 'Term II', label: 'Term II' },
  { value: 'Term III', label: 'Term III' },
];

const TEMPLATE_HEADERS = [
  'SDMS Code',
  'Names',
  'First Name',
  'Last Name',
  'Gender',
  'Date of Birth',
  'Age',
  'Class',
  'Father Name',
  'Mother Name',
  'Father Phone',
  'Mother Phone',
  'District',
  'Sector',
  'Cell',
  'Village',
];

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

/** Split "Names" / full name into first + last; keep separate Firstname/Lastname when present. */
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

  // Combined in one of the name fields only
  if (firstName && !lastName) {
    const parts = firstName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    }
  }
  if (lastName && !firstName) {
    const parts = lastName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    }
  }

  return { firstName, lastName };
}

function mapRows(raw: Record<string, unknown>[]): ImportRowPayload[] {
  return raw.map((r) => {
    let dateOfBirth = cell(r, 'dateOfBirth', 'dob', 'date of birth', 'birthdate');
    if (dateOfBirth && !Number.isNaN(Date.parse(dateOfBirth))) {
      dateOfBirth = new Date(dateOfBirth).toISOString().slice(0, 10);
    }
    const { firstName, lastName } = resolveNames(r);
    return {
      firstName,
      lastName,
      gender: cell(r, 'gender', 'sex'),
      dateOfBirth: dateOfBirth || undefined,
      age: cell(r, 'age') || undefined,
      // Government SDMS — optional; never auto-filled
      sdmCode: cell(r, 'sdmCode', 'sdms', 'sdm', 'sdmscode', 'sdms code', 'sdmsCode') || undefined,
      className: cell(r, 'className', 'class', 'classname', 'grade') || undefined,
      fatherName: cell(r, 'fatherName', 'father', 'father name') || undefined,
      motherName: cell(r, 'motherName', 'mother', 'mother name') || undefined,
      fatherPhone: cell(r, 'fatherPhone', 'father phone') || undefined,
      motherPhone: cell(r, 'motherPhone', 'mother phone') || undefined,
      district: cell(r, 'district') || undefined,
      sector: cell(r, 'sector') || undefined,
      cell: cell(r, 'cell') || undefined,
      village: cell(r, 'village') || undefined,
    };
  });
}

function statusColor(status: ImportPreviewRow['status']) {
  if (status === 'ready') return '#16a34a';
  if (status === 'duplicate' || status === 'review') return '#ca8a04';
  return '#dc2626';
}

function statusLabel(status: ImportPreviewRow['status']) {
  if (status === 'ready') return 'Ready';
  if (status === 'duplicate') return 'Duplicate';
  if (status === 'review') return 'Review';
  return 'Invalid';
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

export default function StudentImportWizard({ open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [term, setTerm] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [rawRows, setRawRows] = useState<ImportRowPayload[]>([]);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    ready: number;
    duplicates: number;
    invalid: number;
    autoGenerateSdms: number;
  } | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update'>('skip');
  const [filter, setFilter] = useState<'all' | 'ready' | 'duplicates' | 'invalid'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setStep(0);
    setAcademicYear('2025-2026');
    setTerm('');
    setFile(null);
    setUploadProgress(0);
    setRawRows([]);
    setPreviewRows([]);
    setSummary(null);
    setDuplicateMode('skip');
    setFilter('all');
    setSearch('');
    setPage(0);
    setLoadingPreview(false);
    setImporting(false);
    setImportProgress(0);
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const parseFile = async (f: File) => {
    setError('');
    setFile(f);
    setUploadProgress(30);
    const buf = await f.arrayBuffer();
    setUploadProgress(70);
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    setUploadProgress(100);
    if (!json.length) {
      setError('Spreadsheet has no data rows');
      toast.error('Spreadsheet has no data rows');
      setRawRows([]);
      return;
    }
    setRawRows(mapRows(json));
  };

  const onFilePicked = async (f?: File | null) => {
    if (!f) return;
    const ok = /\.(xlsx|xls|csv)$/i.test(f.name);
    if (!ok) {
      setError('Supported formats: .xlsx, .xls, .csv');
      toast.error('Supported formats: .xlsx, .xls, .csv');
      return;
    }
    await parseFile(f);
  };

  const runServerPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError('');
    try {
      const data = await previewStudentImport({
        academicYear,
        term: term || undefined,
        rows: rawRows,
      });
      setPreviewRows(data.rows);
      setSummary(data.summary);
      setStep(3);
    } catch (err) {
      const e = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const detail =
        e.response?.data?.message ||
        (e.response?.status ? `Server responded ${e.response.status}` : '') ||
        e.message ||
        '';
      setError(
        `Could not validate against the server${detail ? `: ${detail}` : ''}. ` +
          'Ensure Academic Backend (:3003) is running and you opened Academic from the org dashboard.'
      );
      toast.error('Could not validate the import file against the server');
    } finally {
      setLoadingPreview(false);
    }
  }, [academicYear, term, rawRows]);

  const filtered = useMemo(() => {
    let list = previewRows;
    if (filter === 'ready') list = list.filter((r) => r.status === 'ready');
    if (filter === 'duplicates') list = list.filter((r) => r.status === 'duplicate' || r.status === 'review');
    if (filter === 'invalid') list = list.filter((r) => r.status === 'invalid');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
          (r.sdmCode ?? '').toLowerCase().includes(q) ||
          (r.className ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [previewRows, filter, search]);

  const paged = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const startImport = async () => {
    setImporting(true);
    setImportProgress(8);
    setError('');
    setStep(5);
    const timer = window.setInterval(() => {
      setImportProgress((p) => (p >= 90 ? p : p + 7));
    }, 200);
    try {
      const data = await importStudentsRows({
        academicYear,
        term: term || undefined,
        duplicateMode,
        importValidOnly: true,
        generateMissingSdms: true,
        rows: rawRows,
      });
      setImportProgress(100);
      setResult(data);
      onImported();
    } catch {
      setError('Import failed. Please try again.');
      setStep(4);
    } finally {
      window.clearInterval(timer);
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const sampleCombined = [
      '',
      'John Doe',
      '',
      '',
      'Male',
      '2014-08-15',
      '11',
      'P4',
      'Jean Doe',
      'Marie Doe',
      '0788123456',
      '0789123456',
      'Gasabo',
      'Remera',
      'Rukiri',
      'Village A',
    ];
    const sampleSplit = [
      'SDMS001',
      '',
      'Alice',
      'Smith',
      'Female',
      '2015-03-20',
      '10',
      'P5',
      'Paul Smith',
      'Ann Smith',
      '0788000111',
      '0788000222',
      'Gasabo',
      'Kimironko',
      'Cell B',
      'Village B',
    ];
    downloadCsv('students-import-template.csv', TEMPLATE_HEADERS, [sampleCombined, sampleSplit]);
  };

  const canNext = () => {
    if (step === 0) return !!academicYear;
    if (step === 1) return !!file && rawRows.length > 0 && uploadProgress === 100;
    if (step === 2) return rawRows.length > 0;
    if (step === 3) return !!summary;
    if (step === 4) return (summary?.ready ?? 0) > 0 || duplicateMode === 'update';
    return false;
  };

  const goNext = async () => {
    if (step === 2) {
      await runServerPreview();
      return;
    }
    if (step === 4) {
      await startImport();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, minHeight: '70vh' } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: NAVY }}>Import Students</Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.5 }}>
          Multi-step wizard · Academic year required · SDMS optional · ShuleCode auto-generated
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, '& .MuiStepIcon-root.Mui-active': { color: AMBER }, '& .MuiStepIcon-root.Mui-completed': { color: NAVY } }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {step === 0 && (
          <Box sx={{ maxWidth: 480, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="info" sx={{ fontSize: '0.8125rem' }}>
              Selected Academic Year and Term will be applied to all imported students.
            </Alert>
            <FormControl fullWidth required>
              <InputLabel>Academic Year</InputLabel>
              <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                {YEAR_OPTIONS.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y.replace('-', '–')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Term / Semester (optional)</InputLabel>
              <Select label="Term / Semester (optional)" value={term} onChange={(e) => setTerm(e.target.value)}>
                {TERM_OPTIONS.map((t) => (
                  <MenuItem key={t.value || 'empty'} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button startIcon={<DownloadIcon />} onClick={downloadTemplate} sx={{ textTransform: 'none', fontWeight: 700, color: NAVY }}>
                Download Excel Template
              </Button>
            </Box>
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void onFilePicked(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? AMBER : 'rgba(0,4,53,0.15)',
                bgcolor: dragOver ? 'rgba(252,176,56,0.08)' : '#F8FAFC',
                borderRadius: 3,
                p: 5,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { borderColor: AMBER, bgcolor: 'rgba(252,176,56,0.06)' },
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: AMBER, mb: 1 }} />
              <Typography sx={{ fontWeight: 700, color: NAVY, mb: 0.5 }}>Upload Student Excel File</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#64748b', mb: 2 }}>Drag & drop your Excel file here, or browse</Typography>
              <Button variant="contained" sx={{ textTransform: 'none', fontWeight: 700, bgcolor: NAVY, '&:hover': { bgcolor: '#0a0f4a' } }}>
                Browse Computer
              </Button>
              <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 2 }}>Supported: .xlsx .xls .csv</Typography>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept=".xlsx,.xls,.csv"
                onChange={(e) => void onFilePicked(e.target.files?.[0])}
              />
            </Box>
            {file && (
              <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
                <Typography sx={{ fontWeight: 700, color: NAVY }}>{file.name}</Typography>
                <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Size {formatBytes(file.size)} · Rows {rawRows.length}
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1.5, height: 8, borderRadius: 4, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: AMBER } }} />
                <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.5 }}>{uploadProgress}%</Typography>
              </Box>
            )}
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.8125rem' }}>
              Required: Name (or First + Last), Gender, Class. <strong>SDMS Code</strong> is government and optional
              (left blank if empty). <strong>ShuleCode</strong> is generated automatically as DD+ORG+SEQ+YY.
              Use a <strong>Names</strong> column or separate First Name / Last Name.
            </Alert>
            <TableContainer sx={{ maxHeight: 360, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['SDMS Code', 'ShuleCode', 'First Name', 'Last Name', 'Gender', 'Class', 'Father Phone'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rawRows.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{r.sdmCode || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>
                        <Chip size="small" label="Auto Generate" sx={{ bgcolor: 'rgba(252,176,56,0.15)', color: NAVY, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{r.firstName || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{r.lastName || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{r.gender || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{r.className || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{r.fatherPhone || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {rawRows.length > 50 && (
              <Typography sx={{ mt: 1, fontSize: '0.75rem', color: '#64748b' }}>Showing first 50 of {rawRows.length} rows</Typography>
            )}
          </Box>
        )}

        {step === 3 && summary && (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5, mb: 2.5 }}>
              {[
                ['Total Rows', summary.total],
                ['Ready to Import', summary.ready],
                ['Duplicates', summary.duplicates],
                ['Invalid', summary.invalid],
                ['ShuleCodes to generate', summary.autoGenerateSdms],
              ].map(([label, value]) => (
                <Box key={String(label)} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{label}</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: NAVY }}>{value}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
              {([
                ['all', 'All'],
                ['ready', 'Ready'],
                ['duplicates', 'Duplicates'],
                ['invalid', 'Invalid'],
              ] as const).map(([k, label]) => (
                <Chip
                  key={k}
                  label={label}
                  onClick={() => {
                    setFilter(k);
                    setPage(0);
                  }}
                  sx={{
                    fontWeight: 600,
                    bgcolor: filter === k ? AMBER : '#f1f5f9',
                    color: filter === k ? NAVY : '#475569',
                  }}
                />
              ))}
              <TextField
                size="small"
                placeholder="Search name or SDMS"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ ml: 'auto', minWidth: 220 }}
              />
              <Button
                size="small"
                onClick={() =>
                  downloadCsv(
                    'validation-report.csv',
                    ['Row', 'Status', 'SDMS', 'Name', 'Class', 'Reason'],
                    previewRows.map((r) => [
                      String(r.row),
                      r.status,
                      r.sdmCode || '',
                      `${r.firstName} ${r.lastName}`,
                      r.className || '',
                      r.reason,
                    ])
                  )
                }
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Export preview
              </Button>
            </Box>

            <TableContainer sx={{ maxHeight: 320, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['Status', 'SDMS', 'ShuleCode', 'Student Name', 'Class', 'Reason'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paged.map((r) => (
                    <TableRow key={r.row}>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel(r.status)}
                          sx={{ bgcolor: `${statusColor(r.status)}22`, color: statusColor(r.status), fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{r.sdmCode || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>
                        {r.status === 'ready' ? (
                          <Chip size="small" label="Auto" sx={{ bgcolor: 'rgba(252,176,56,0.15)', color: NAVY, fontWeight: 600 }} />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>
                        {r.firstName} {r.lastName}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{r.className || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>{r.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Box>
        )}

        {step === 4 && summary && (
          <Box sx={{ maxWidth: 560, mx: 'auto' }}>
            <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F8FAFC', border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <Typography sx={{ fontWeight: 800, color: NAVY, mb: 2 }}>Import Summary</Typography>
              {[
                ['Total Rows', summary.total],
                ['Ready to Import', summary.ready],
                ['Duplicates', summary.duplicates],
                ['Invalid Records', summary.invalid],
                ['Academic Year', academicYear.replace('-', '–')],
                ['Term', term || '—'],
                ['ShuleCodes to generate', summary.autoGenerateSdms],
                ['SDMS Codes', 'Optional — left blank if empty'],
              ].map(([k, v]) => (
                <Box key={String(k)} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #eef2f7' }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>{k}</Typography>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY }}>{v}</Typography>
                </Box>
              ))}
            </Box>

            <Typography sx={{ fontWeight: 700, color: NAVY, mb: 1 }}>Duplicate handling</Typography>
            <RadioGroup value={duplicateMode} onChange={(e) => setDuplicateMode(e.target.value as 'skip' | 'update')}>
              <FormControlLabel value="skip" control={<Radio sx={{ color: AMBER, '&.Mui-checked': { color: AMBER } }} />} label="Skip Duplicates (Recommended)" />
              <FormControlLabel value="update" control={<Radio sx={{ color: AMBER, '&.Mui-checked': { color: AMBER } }} />} label="Update Existing Students" />
            </RadioGroup>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 1 }}>
              Invalid rows are skipped. SDMS (government) stays empty when missing. ShuleCode (DD+ORG+SEQ+YY) is always generated for new students.
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  downloadCsv(
                    'validation-errors.csv',
                    ['Row', 'Name', 'Reason'],
                    previewRows.filter((r) => r.status === 'invalid').map((r) => [String(r.row), `${r.firstName} ${r.lastName}`, r.reason])
                  )
                }
                sx={{ textTransform: 'none' }}
              >
                Download Validation Report
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  downloadCsv(
                    'duplicates-report.csv',
                    ['Row', 'Name', 'Reason'],
                    previewRows
                      .filter((r) => r.status === 'duplicate' || r.status === 'review')
                      .map((r) => [String(r.row), `${r.firstName} ${r.lastName}`, r.reason])
                  )
                }
                sx={{ textTransform: 'none' }}
              >
                Download Duplicate Report
              </Button>
            </Box>
          </Box>
        )}

        {step === 5 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {importing || !result ? (
              <>
                <Typography sx={{ fontWeight: 800, color: NAVY, mb: 2 }}>Importing Students…</Typography>
                <LinearProgress
                  variant="determinate"
                  value={importProgress}
                  sx={{ maxWidth: 420, mx: 'auto', height: 10, borderRadius: 5, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: AMBER } }}
                />
                <Typography sx={{ mt: 1.5, color: '#64748b' }}>{importProgress}%</Typography>
              </>
            ) : (
              <>
                {result.created + result.updated > 0 && result.failed === 0 ? (
                  <>
                    <CheckCircleIcon sx={{ fontSize: 56, color: '#16a34a', mb: 1 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: NAVY, mb: 2 }}>Import Completed Successfully</Typography>
                  </>
                ) : result.created + result.updated > 0 ? (
                  <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#d97706', mb: 2 }}>
                    Import Completed with Errors
                  </Typography>
                ) : (
                  <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#dc2626', mb: 2 }}>
                    Import Failed — No Students Were Imported
                  </Typography>
                )}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5, maxWidth: 640, mx: 'auto', mb: 3 }}>
                  {[
                    ['Students Imported', result.created],
                    ['Updated', result.updated],
                    ['Duplicates Skipped', result.skipped],
                    ['Failed Rows', result.failed],
                    ['ShuleCodes Generated', result.generatedSdms],
                    ['Duration', `${Math.round(result.durationMs / 1000)}s`],
                  ].map(([label, value]) => (
                    <Box key={String(label)} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid', borderColor: 'divider' }}>
                      <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{label}</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: NAVY }}>{value}</Typography>
                    </Box>
                  ))}
                </Box>
                {result.errors.length > 0 && (
                  <Box sx={{ maxWidth: 640, mx: 'auto', mb: 3, textAlign: 'left', border: '1px solid #fecaca', bgcolor: '#fef2f2', borderRadius: 2, p: 1.5, maxHeight: 180, overflow: 'auto' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', mb: 0.75 }}>
                      Errors ({result.errors.length})
                    </Typography>
                    {result.errors.slice(0, 20).map((e, i) => (
                      <Typography key={i} sx={{ fontSize: '0.75rem', color: '#7f1d1d' }}>
                        Row {e.row}: {e.message}
                      </Typography>
                    ))}
                    {result.errors.length > 20 && (
                      <Typography sx={{ fontSize: '0.75rem', color: '#7f1d1d', fontStyle: 'italic' }}>
                        …and {result.errors.length - 20} more
                      </Typography>
                    )}
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      downloadCsv(
                        'import-report.csv',
                        ['UID', 'Name', 'SDMS'],
                        result.students.map((s) => [s.studentUid, s.name, s.sdmCode || ''])
                      )
                    }
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Download Import Report
                  </Button>
                  <Button variant="contained" onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: NAVY }}>
                    Done
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>

      {step < 5 && (
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} disabled={importing} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          {step > 0 && step < 5 && (
            <Button onClick={() => setStep((s) => s - 1)} disabled={importing || loadingPreview} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Back
            </Button>
          )}
          <Button
            variant="contained"
            disabled={!canNext() || importing || loadingPreview}
            onClick={() => void goNext()}
            startIcon={loadingPreview ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: AMBER, color: NAVY, '&:hover': { bgcolor: '#e09a2a' } }}
          >
            {step === 2 ? (loadingPreview ? 'Validating…' : 'Validate & Detect Duplicates') : step === 4 ? 'Start Import' : 'Continue'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
