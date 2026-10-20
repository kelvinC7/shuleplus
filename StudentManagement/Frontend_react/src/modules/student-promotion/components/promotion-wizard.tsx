import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ClassOutlinedIcon from '@mui/icons-material/ClassOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import type { AcademicSettings, ApiClass, Student } from '@/types';
import type { PromotionMode } from '../types';
import {
  classLabel,
  DEFAULT_PROMOTION_RULES,
  formatYearDisplay,
  getEnrollmentForYear,
  nextAcademicYear,
  shortClassLabel,
  suggestTargetClass,
  NAVY,
  GOLD,
} from '../utils';
import { PromotionWizardStudentPreview } from './promotion-wizard-student-preview';

const AMBER = GOLD;
const STEPS = ['Academic Years', 'Promotion Method', 'Class Assignment', 'Ready to Promote'];

export interface PromotionWizardConfig {
  fromYear: string;
  toYear: string;
  mode: PromotionMode;
  fromClassId: string | null;
  toClassId: string | null;
  selectedStudentIds: string[];
}

interface PromotionWizardProps {
  open: boolean;
  onClose: () => void;
  onStart: (config: PromotionWizardConfig) => void;
  academicSettings: AcademicSettings | null;
  classes: ApiClass[];
  students: Student[];
  initial: PromotionWizardConfig;
}

export function PromotionWizard({
  open,
  onClose,
  onStart,
  academicSettings,
  classes,
  students,
  initial,
}: PromotionWizardProps) {
  const [step, setStep] = useState(0);
  const [fromYear, setFromYear] = useState(initial.fromYear);
  const [toYear, setToYear] = useState(initial.toYear);
  const [mode, setMode] = useState<PromotionMode>(initial.mode);
  const [fromClassId, setFromClassId] = useState<string | null>(initial.fromClassId);
  const [toClassId, setToClassId] = useState<string | null>(initial.toClassId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState<string | null>(null);

  const years = academicSettings?.academicYears ?? [];

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFromYear(initial.fromYear);
    setToYear(initial.toYear);
    setMode(initial.mode);
    setFromClassId(initial.fromClassId);
    setToClassId(initial.toClassId);
    setSelectedIds(new Set());
    setStudentSearch('');
    setStudentClassFilter(null);
  }, [open, initial.fromYear, initial.toYear, initial.mode, initial.fromClassId, initial.toClassId]);

  const fromClass = useMemo(() => classes.find((c) => c.id === fromClassId) ?? null, [classes, fromClassId]);
  const toClass = useMemo(() => classes.find((c) => c.id === toClassId) ?? null, [classes, toClassId]);

  const eligibleStudents = useMemo(() => {
    if (!fromYear) return [];
    if (mode === 'by_class' && fromClassId) {
      return students.filter((s) => {
        const en = getEnrollmentForYear(s, fromYear);
        return en?.classId === fromClassId && en.status === 'ACTIVE';
      });
    }
    return students.filter((s) => getEnrollmentForYear(s, fromYear)?.status === 'ACTIVE');
  }, [students, fromYear, mode, fromClassId]);

  const filteredEligibleStudents = useMemo(() => {
    if (mode !== 'select_students') return eligibleStudents;
    let list = eligibleStudents;
    if (studentClassFilter) {
      list = list.filter((s) => getEnrollmentForYear(s, fromYear)?.classId === studentClassFilter);
    }
    if (studentSearch.trim()) {
      const q = studentSearch.trim().toLowerCase();
      list = list.filter((s) => {
        const en = getEnrollmentForYear(s, fromYear);
        const className = en?.class?.name?.toLowerCase() ?? '';
        const stream = en?.class?.stream?.toLowerCase() ?? '';
        return (
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.studentUid.toLowerCase().includes(q) ||
          (s.studentCode ?? '').toLowerCase().includes(q) ||
          (s.sdmCode ?? '').toLowerCase().includes(q) ||
          className.includes(q) ||
          stream.includes(q) ||
          `${className} ${stream}`.includes(q)
        );
      });
    }
    return list;
  }, [mode, eligibleStudents, studentClassFilter, studentSearch, fromYear]);

  const previewStudents = mode === 'select_students' ? filteredEligibleStudents : eligibleStudents;
  const eligibleCount = eligibleStudents.length;
  const selectedCount = selectedIds.size;

  useEffect(() => {
    if (step < 2 || mode !== 'by_class') return;
    if (!fromClassId || !toClassId) return;
    setSelectedIds(new Set(eligibleStudents.map((s) => s.id)));
  }, [fromClassId, toClassId, fromYear, mode, step, eligibleStudents]);

  const handleFromYearChange = (year: string) => {
    setFromYear(year);
    const next = nextAcademicYear(year, years);
    if (next) setToYear(next);
    setFromClassId(null);
    setToClassId(null);
  };

  const handleFromClassChange = (classId: string) => {
    setFromClassId(classId);
    setSelectedIds(new Set());
    const from = classes.find((c) => c.id === classId);
    if (from) {
      const suggested = suggestTargetClass(from, classes);
      setToClassId(suggested?.id ?? null);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllStudents = () => setSelectedIds(new Set(previewStudents.map((s) => s.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleClose = () => {
    onClose();
  };

  const canNext = () => {
    if (step === 0) return !!fromYear && !!toYear && fromYear !== toYear;
    if (step === 1) return !!mode;
    if (step === 2) {
      if (mode === 'by_class') return !!fromClassId && !!toClassId && selectedCount > 0;
      return selectedCount > 0;
    }
    if (step === 3) return selectedCount > 0;
    return true;
  };

  const noStudentsMessage =
    mode === 'by_class' && fromClass
      ? `No active students found in ${shortClassLabel(fromClass)} for ${formatYearDisplay(fromYear)}. Choose another class or enroll students first.`
      : `No active students found for ${formatYearDisplay(fromYear)}. Enroll students before starting promotion.`;

  const handleFinish = () => {
    if (selectedCount === 0) return;
    onStart({
      fromYear,
      toYear,
      mode,
      fromClassId,
      toClassId,
      selectedStudentIds: [...selectedIds],
    });
    onClose();
  };

  const goNext = () => {
    if (step === STEPS.length - 1) {
      handleFinish();
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
      slotProps={{ paper: { sx: { borderRadius: 3, minHeight: '68vh', maxWidth: 960 } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: NAVY,
              color: AMBER,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUpOutlinedIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: NAVY }}>Start Student Promotion</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mt: 0.25 }}>
              Academic year transition · Preserves history · Creates new enrollments
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stepper
          activeStep={step}
          alternativeLabel
          sx={{
            mb: 3,
            '& .MuiStepIcon-root.Mui-active': { color: AMBER },
            '& .MuiStepIcon-root.Mui-completed': { color: NAVY },
          }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 && (
          <Box sx={{ maxWidth: 520, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="info" sx={{ fontSize: '0.8125rem' }}>
              Students stay in the previous academic year as historical records. Promotion creates new enrollment records
              for the target year.
            </Alert>

            <Box
              sx={{
                textAlign: 'center',
                py: 1.5,
                px: 2,
                borderRadius: 2,
                bgcolor: NAVY,
                color: 'white',
              }}
            >
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85 }}>
                PROMOTE STUDENTS
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' }, gap: 2, alignItems: 'end' }}>
              <FormControl fullWidth required>
                <InputLabel>From Academic Year</InputLabel>
                <Select label="From Academic Year" value={fromYear} onChange={(e) => handleFromYearChange(e.target.value)}>
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>
                      {formatYearDisplay(y)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <ArrowForwardIcon sx={{ color: AMBER, fontSize: 28 }} />
              </Box>
              <FormControl fullWidth required>
                <InputLabel>To Academic Year</InputLabel>
                <Select label="To Academic Year" value={toYear} onChange={(e) => setToYear(e.target.value)}>
                  {years.map((y) => (
                    <MenuItem key={y} value={y} disabled={y === fromYear}>
                      {formatYearDisplay(y)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(0,4,53,0.03)', border: '1px solid rgba(0,4,53,0.06)' }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                  <LockOutlinedIcon sx={{ fontSize: 18, color: NAVY }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY }}>Previous Year</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  {formatYearDisplay(fromYear)} remains unchanged after promotion.
                </Typography>
              </Box>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(252,176,56,0.08)', border: '1px solid rgba(252,176,56,0.25)' }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                  <ArrowForwardIcon sx={{ fontSize: 18, color: AMBER }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY }}>New Year</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  New enrollments created for {formatYearDisplay(toYear)}.
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ maxWidth: 560, mx: 'auto' }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY, mb: 2 }}>Choose promotion method</Typography>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as PromotionMode)}>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: mode === 'by_class' ? AMBER : 'rgba(0,4,53,0.12)',
                  borderRadius: 2,
                  p: 2,
                  mb: 1.5,
                  bgcolor: mode === 'by_class' ? 'rgba(252,176,56,0.06)' : 'white',
                }}
              >
                <FormControlLabel
                  value="by_class"
                  control={<Radio sx={{ color: NAVY, '&.Mui-checked': { color: AMBER } }} />}
                  label={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ClassOutlinedIcon sx={{ fontSize: 18, color: NAVY }} />
                        <Typography sx={{ fontWeight: 700, color: NAVY }}>Promote by Class</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5 }}>
                        Best for normal end-of-year promotion (e.g. P5 → P6)
                      </Typography>
                    </Box>
                  }
                />
              </Box>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: mode === 'select_students' ? AMBER : 'rgba(0,4,53,0.12)',
                  borderRadius: 2,
                  p: 2,
                  bgcolor: mode === 'select_students' ? 'rgba(252,176,56,0.06)' : 'white',
                }}
              >
                <FormControlLabel
                  value="select_students"
                  control={<Radio sx={{ color: NAVY, '&.Mui-checked': { color: AMBER } }} />}
                  label={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonSearchOutlinedIcon sx={{ fontSize: 18, color: NAVY }} />
                        <Typography sx={{ fontWeight: 700, color: NAVY }}>Select Students</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5 }}>
                        For repeats, skips, transfers, or individual placement
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </RadioGroup>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {mode === 'by_class' ? (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>From Class</InputLabel>
                    <Select
                      label="From Class"
                      value={fromClassId ?? ''}
                      onChange={(e) => handleFromClassChange(e.target.value)}
                    >
                      {classes.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {classLabel(c)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth required size="small">
                    <InputLabel>To Class</InputLabel>
                    <Select
                      label="To Class"
                      value={toClassId ?? ''}
                      onChange={(e) => setToClassId(e.target.value || null)}
                    >
                      {classes
                        .filter((c) => c.id !== fromClassId)
                        .map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {classLabel(c)}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Box>

                {fromClass && toClass && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      py: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(0,4,53,0.03)',
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 700, color: NAVY }}>{shortClassLabel(fromClass)}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{formatYearDisplay(fromYear)}</Typography>
                    </Box>
                    <Typography sx={{ color: AMBER, fontWeight: 700, fontSize: '1.25rem' }}>→</Typography>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 700, color: NAVY }}>{shortClassLabel(toClass)}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{formatYearDisplay(toYear)}</Typography>
                    </Box>
                  </Box>
                )}

                {fromClass && eligibleCount > 0 && (
                  <Alert severity="success" sx={{ fontSize: '0.8125rem' }}>
                    {eligibleCount} active student{eligibleCount !== 1 ? 's' : ''} found in {shortClassLabel(fromClass)}.
                    Uncheck any student you want to exclude.
                  </Alert>
                )}
                {fromClass && eligibleCount === 0 && (
                  <Alert severity="warning" sx={{ fontSize: '0.8125rem' }}>
                    {noStudentsMessage}
                  </Alert>
                )}

                {eligibleStudents.length > 0 && toClass && (
                  <PromotionWizardStudentPreview
                    students={eligibleStudents}
                    fromYear={fromYear}
                    classes={classes}
                    toClass={toClass}
                    selectedIds={selectedIds}
                    onToggle={toggleStudent}
                    onSelectAll={selectAllStudents}
                    onClearSelection={clearSelection}
                  />
                )}

                <Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, mb: 1 }}>Promotion rules</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {DEFAULT_PROMOTION_RULES.map((rule) => (
                      <Chip
                        key={rule.from}
                        size="small"
                        label={`${rule.from} → ${rule.to}`}
                        sx={{ fontSize: '0.6875rem', bgcolor: 'rgba(0,4,53,0.04)' }}
                      />
                    ))}
                  </Box>
                </Box>
              </>
            ) : (
              <>
                <Alert severity="info" sx={{ fontSize: '0.8125rem' }}>
                  Search and select students to include in this promotion. You can assign target classes during review.
                </Alert>

                {eligibleCount > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                    <TextField
                      size="small"
                      placeholder="Search by name, code, SDMS, or class…"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ minWidth: { xs: '100%', sm: 280 }, flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>Class</InputLabel>
                      <Select
                        label="Class"
                        value={studentClassFilter ?? ''}
                        onChange={(e) => setStudentClassFilter(e.target.value || null)}
                      >
                        <MenuItem value="">All Classes</MenuItem>
                        {classes.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {classLabel(c)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {eligibleCount === 0 ? (
                  <Alert severity="warning" sx={{ fontSize: '0.8125rem' }}>
                    {noStudentsMessage}
                  </Alert>
                ) : previewStudents.length === 0 ? (
                  <Alert severity="warning" sx={{ fontSize: '0.8125rem' }}>
                    No students match your search. Try a different name, code, SDMS, or class.
                  </Alert>
                ) : (
                  <PromotionWizardStudentPreview
                    students={previewStudents}
                    fromYear={fromYear}
                    classes={classes}
                    toClass={toClass}
                    selectedIds={selectedIds}
                    onToggle={toggleStudent}
                    onSelectAll={selectAllStudents}
                    onClearSelection={clearSelection}
                  />
                )}
              </>
            )}
          </Box>
        )}

        {step === 3 && (
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(252,176,56,0.15)',
                color: AMBER,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <TrendingUpOutlinedIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY, mb: 1 }}>
              {selectedCount > 0 ? 'Ready to promote' : 'Cannot promote yet'}
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 3 }}>
              {selectedCount > 0
                ? `${selectedCount} student${selectedCount !== 1 ? 's' : ''} selected. Continue to review and confirm promotion.`
                : noStudentsMessage}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
                textAlign: 'left',
                mb: 3,
                maxWidth: 520,
                mx: 'auto',
              }}
            >
              {[
                ['From year', formatYearDisplay(fromYear)],
                ['To year', formatYearDisplay(toYear)],
                ['Method', mode === 'by_class' ? 'Promote by Class' : 'Select Students'],
                ['Students selected', String(selectedCount)],
                ...(fromClass && toClass
                  ? [
                      ['From class', shortClassLabel(fromClass)],
                      ['To class', shortClassLabel(toClass)],
                    ]
                  : []),
              ].map(([label, value]) => (
                <Box key={String(label)} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{label}</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', color: NAVY }}>{value}</Typography>
                </Box>
              ))}
            </Box>

            {selectedCount > 0 && toClass && (
              <Box sx={{ mb: 3, textAlign: 'left' }}>
                <PromotionWizardStudentPreview
                  students={eligibleStudents.filter((s) => selectedIds.has(s.id))}
                  fromYear={fromYear}
                  classes={classes}
                  toClass={toClass}
                  selectedIds={selectedIds}
                  onToggle={toggleStudent}
                  onSelectAll={selectAllStudents}
                  onClearSelection={clearSelection}
                />
              </Box>
            )}

            {selectedCount === 0 && (
              <Alert severity="error" sx={{ textAlign: 'left', fontSize: '0.8125rem', mb: 2, maxWidth: 520, mx: 'auto' }}>
                Promotion is blocked because no students are selected. Go back and select at least one student.
              </Alert>
            )}

            <Alert severity="warning" sx={{ textAlign: 'left', fontSize: '0.8125rem', maxWidth: 520, mx: 'auto' }}>
              Previous enrollments in {formatYearDisplay(fromYear)} will not be edited or deleted.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        {step > 0 && (
          <Button onClick={() => setStep((s) => s - 1)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Back
          </Button>
        )}
        <Button
          variant="contained"
          disabled={!canNext()}
          onClick={goNext}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: AMBER, color: NAVY, '&:hover': { bgcolor: '#e09a2a' } }}
        >
          {step === STEPS.length - 1 ? 'Review & Promote' : 'Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
