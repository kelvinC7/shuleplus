import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import type { ReportScopeMode, ReportTypeId } from '@/components/reports/report-cards-utils';
import { REPORT_TYPE_OPTIONS } from '@/components/reports/report-cards-utils';

const NAVY = '#000435';
const AMBER = '#FCB038';

export type GenerateScope = 'all_school' | 'classes' | 'streams' | 'individual';

export type GenerateWizardConfig = {
  reportType: ReportTypeId;
  academicYear: string;
  term: string;
  reportScope: ReportScopeMode;
  generateScope: GenerateScope;
  classNameKey: string;
  streamFilter: string;
  studentCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  academicYears: string[];
  terms: string[];
  classNames: string[];
  streamsForClass: string[];
  classNameKey: string;
  streamFilter: string;
  studentCount: number;
  initialYear: string;
  initialTerm: string;
  initialScope: ReportScopeMode;
  onGenerate: (config: GenerateWizardConfig) => void;
};

const STEPS = ['Report type', 'Academic period', 'Students', 'Review'];

export default function ReportGenerateWizard({
  open,
  onClose,
  academicYears,
  terms,
  classNames,
  streamsForClass,
  classNameKey,
  streamFilter,
  studentCount,
  initialYear,
  initialTerm,
  initialScope,
  onGenerate,
}: Props) {
  const [step, setStep] = useState(0);
  const [reportType, setReportType] = useState<ReportTypeId>('standard');
  const [academicYear, setAcademicYear] = useState(initialYear);
  const [term, setTerm] = useState(initialTerm);
  const [reportScope, setReportScope] = useState<ReportScopeMode>(initialScope);
  const [generateScope, setGenerateScope] = useState<GenerateScope>('classes');
  const [wizardClass, setWizardClass] = useState(classNameKey);
  const [wizardStream, setWizardStream] = useState(streamFilter);

  const effectiveCount = useMemo(() => {
    if (generateScope === 'individual') return 1;
    if (generateScope === 'all_school') return studentCount || 0;
    return studentCount;
  }, [generateScope, studentCount]);

  const canNext = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return Boolean(academicYear && term);
    if (step === 2) {
      if (generateScope === 'all_school') return true;
      if (generateScope === 'individual') return Boolean(classNameKey);
      return Boolean(wizardClass || classNameKey);
    }
    return true;
  }, [step, academicYear, term, generateScope, wizardClass, classNameKey]);

  function handleClose() {
    setStep(0);
    onClose();
  }

  function handleFinish() {
    onGenerate({
      reportType,
      academicYear,
      term,
      reportScope,
      generateScope,
      classNameKey: wizardClass || classNameKey,
      streamFilter: wizardStream,
      studentCount: effectiveCount,
    });
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: NAVY }}>Generate academic reports</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 ? (
          <Box>
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 2 }}>
              Choose the report layout. Standard uses the modern parent-friendly PDF.
            </Typography>
            <RadioGroup value={reportType} onChange={(e) => setReportType(e.target.value as ReportTypeId)}>
              {REPORT_TYPE_OPTIONS.filter((o) => o.id === 'standard' || o.id === 'detailed' || o.id === 'transcript').map(
                (o) => (
                  <FormControlLabel
                    key={o.id}
                    value={o.id}
                    control={<Radio sx={{ color: NAVY, '&.Mui-checked': { color: AMBER } }} />}
                    label={
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: NAVY }}>{o.label}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{o.hint}</Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', mb: 1, ml: 0 }}
                  />
                )
              )}
            </RadioGroup>
          </Box>
        ) : null}

        {step === 1 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Academic year</InputLabel>
              <Select label="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                {academicYears.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Term / period</InputLabel>
              <Select label="Term / period" value={term} onChange={(e) => setTerm(e.target.value)}>
                {terms.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Marks scope</InputLabel>
              <Select
                label="Marks scope"
                value={reportScope}
                onChange={(e) => setReportScope(e.target.value as ReportScopeMode)}
              >
                <MenuItem value="term">This term only</MenuItem>
                <MenuItem value="combined">Combined through selected term</MenuItem>
                <MenuItem value="year">Full academic year (annual)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        ) : null}

        {step === 2 ? (
          <Box>
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', mb: 2 }}>
              Select who should receive generated report records for this run.
            </Typography>
            <RadioGroup value={generateScope} onChange={(e) => setGenerateScope(e.target.value as GenerateScope)}>
              <FormControlLabel value="all_school" control={<Radio />} label="All active students (current filters)" />
              <FormControlLabel value="classes" control={<Radio />} label="Selected class(es)" />
              <FormControlLabel value="streams" control={<Radio />} label="Selected stream" />
              <FormControlLabel value="individual" control={<Radio />} label="Individual students" />
            </RadioGroup>
            {generateScope !== 'all_school' && generateScope !== 'individual' ? (
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Class</InputLabel>
                  <Select label="Class" value={wizardClass} onChange={(e) => setWizardClass(e.target.value)}>
                    {classNames.map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {generateScope === 'streams' && streamsForClass.length > 0 ? (
                  <FormControl size="small" fullWidth>
                    <InputLabel>Stream</InputLabel>
                    <Select label="Stream" value={wizardStream} onChange={(e) => setWizardStream(e.target.value)}>
                      {streamsForClass.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : null}
              </Box>
            ) : null}
          </Box>
        ) : null}

        {step === 3 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700, color: NAVY }}>Review</Typography>
            {[
              ['Report type', REPORT_TYPE_OPTIONS.find((o) => o.id === reportType)?.label ?? reportType],
              ['Academic year', academicYear],
              ['Term', term],
              ['Scope', reportScope],
              ['Students', effectiveCount ? String(effectiveCount) : 'Select a class first'],
              ['Format', 'A4 PDF · School standard template'],
            ].map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <Typography sx={{ color: '#64748b' }}>{k}</Typography>
                <Typography sx={{ fontWeight: 700, color: NAVY }}>{v}</Typography>
              </Box>
            ))}
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 1 }}>
              Before publishing, the system will flag missing marks, attendance gaps, and empty teacher comments.
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        {step > 0 ? (
          <Button onClick={() => setStep((s) => s - 1)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Back
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            sx={{ bgcolor: NAVY, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#000650' } }}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={!effectiveCount}
            onClick={handleFinish}
            sx={{ bgcolor: AMBER, color: NAVY, textTransform: 'none', fontWeight: 800, '&:hover': { bgcolor: '#e5a032' } }}
          >
            Generate reports
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
