import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Chip, Switch, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SummarizeIcon from '@mui/icons-material/Summarize';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Link, useNavigate } from 'react-router-dom';
import { createAssessmentTemplate } from '@/services/api';
import { toast } from '@/lib/toast';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { EDUCATION_LEVELS } from '@/lib/education-levels';
import { ANNUAL_TEMPLATE_TERM, termDisplayLabel, termOptionsForTemplate } from '@/lib/assessment-template-terms';

export interface ComponentEntry {
  id?: string;
  name: string;
  weight: string;
  required: boolean;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  academicLevel?: string;
  academicYear?: string;
  term?: string;
  defaultCourseMarks?: string;
  components?: string;
}

const ACADEMIC_LEVELS = [...EDUCATION_LEVELS];

export function generateCode(name: string): string {
  if (!name.trim()) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    const w = words[0];
    return w.length > 4 ? w.substring(0, 4).toUpperCase() : w.toUpperCase();
  }
  return words.map((w) => w.charAt(0).toUpperCase()).join('');
}

export function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: 'Info', number: 1, icon: <AssignmentIcon sx={{ fontSize: 18 }} /> },
    { label: 'Components', number: 2, icon: <SummarizeIcon sx={{ fontSize: 18 }} /> },
    { label: 'Review', number: 3, icon: <CheckCircleIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 5, gap: 0 }}>
      {steps.map((step, index) => {
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        return (
          <Box key={step.number} sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCompleted
                    ? 'linear-gradient(135deg, #FCB038 0%, #f59e0b 100%)'
                    : isActive
                      ? 'linear-gradient(135deg, #000435 0%, #000650 100%)'
                      : '#f1f5f9',
                  color: isCompleted || isActive ? '#FFFFFF' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: isCompleted
                    ? '0 4px 14px rgba(252,176,56,0.35)'
                    : isActive
                      ? '0 4px 14px rgba(0,4,53,0.25)'
                      : 'none',
                  transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                {isCompleted ? <CheckCircleIcon sx={{ fontSize: 24 }} /> : step.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#000435' : isCompleted ? '#f59e0b' : '#94a3b8',
                  letterSpacing: '0.03em',
                }}
              >
                {step.label}
              </Typography>
            </Box>
            {index < steps.length - 1 && (
              <Box
                sx={{
                  width: 72,
                  height: 3,
                  mx: 1.5,
                  mt: -2.5,
                  background: currentStep > step.number
                    ? 'linear-gradient(90deg, #FCB038, #f59e0b)'
                    : '#e2e8f0',
                  borderRadius: 4,
                  transition: 'background 0.3s ease',
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#fafbfc',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#cbd5e1' },
    '&.Mui-focused fieldset': { borderColor: '#000435', borderWidth: 2 },
  },
  '& .MuiInputLabel-root': { color: '#64748b', fontSize: '0.875rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#000435' },
};

export function Step1({
  formData,
  setFormData,
  errors,
  settings,
  lockIdentity = false,
}: {
  formData: {
    name: string;
    description: string;
    academicLevel: string;
    academicYear: string;
    term: string;
    defaultCourseMarks?: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  errors: FormErrors;
  settings: { academicYears: string[]; terms: string[] } | null;
  /** When true, name / level / year / term cannot change (active templates). */
  lockIdentity?: boolean;
}) {
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(0,4,53,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AssignmentIcon sx={{ fontSize: 20, color: '#000435' }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#000435', lineHeight: 1.2 }}>
            Template Information
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Set up the basic details for this assessment template
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          label="Template Name"
          required
          fullWidth
          value={formData.name}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
          error={!!errors.name}
          helperText={errors.name}
          placeholder="e.g. Standard Term Assessment"
          disabled={lockIdentity}
          sx={fieldSx}
        />

        <TextField
          label="Description"
          multiline
          rows={2}
          fullWidth
          value={formData.description}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description for this template"
          disabled={lockIdentity}
          sx={fieldSx}
        />

        <TextField
          label="Default course marks"
          required
          fullWidth
          type="number"
          value={formData.defaultCourseMarks}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, defaultCourseMarks: e.target.value }))}
          error={!!errors.defaultCourseMarks}
          helperText={errors.defaultCourseMarks || 'Final normalized result per course is calculated out of this value (e.g. 40, 50, 100).'}
          inputProps={{ min: 1, max: 1000 }}
          sx={fieldSx}
        />

        <FormControl fullWidth error={!!errors.academicLevel}>
          <InputLabel sx={{ color: '#64748b', fontSize: '0.875rem' }}>Education level</InputLabel>
          <Select
            value={formData.academicLevel}
            label="Education level"
            onChange={(e) => setFormData((prev: any) => ({ ...prev, academicLevel: e.target.value }))}
            disabled={lockIdentity}
            sx={{
              borderRadius: '12px',
              backgroundColor: '#fafbfc',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000435', borderWidth: 2 },
            }}
          >
            {ACADEMIC_LEVELS.map((level) => (
              <MenuItem key={level.value} value={level.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                  {level.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
          {errors.academicLevel && (
            <Typography variant="caption" sx={{ color: '#ef4444', ml: 1.5, mt: 0.5 }}>
              {errors.academicLevel}
            </Typography>
          )}
        </FormControl>

        <FormControl fullWidth error={!!errors.academicYear}>
          <InputLabel sx={{ color: '#64748b', fontSize: '0.875rem' }}>Academic Year</InputLabel>
          <Select
            value={formData.academicYear}
            label="Academic Year"
            onChange={(e) => setFormData((prev: any) => ({ ...prev, academicYear: e.target.value }))}
            disabled={lockIdentity}
            sx={{
              borderRadius: '12px',
              backgroundColor: '#fafbfc',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000435', borderWidth: 2 },
            }}
          >
            {(settings?.academicYears ?? []).map((year) => (
              <MenuItem key={year} value={year}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonthIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                  {year}
                </Box>
              </MenuItem>
            ))}
            {(!settings?.academicYears || settings.academicYears.length === 0) && (
              <MenuItem disabled>
                <Typography sx={{ color: '#94a3b8' }}>No academic years configured. Set one in Settings.</Typography>
              </MenuItem>
            )}
          </Select>
          {errors.academicYear && (
            <Typography variant="caption" sx={{ color: '#ef4444', ml: 1.5, mt: 0.5 }}>
              {errors.academicYear}
            </Typography>
          )}
        </FormControl>

        <FormControl fullWidth error={!!errors.term}>
          <InputLabel sx={{ color: '#64748b', fontSize: '0.875rem' }}>Term</InputLabel>
          <Select
            value={formData.term}
            label="Term"
            onChange={(e) => setFormData((prev: any) => ({ ...prev, term: e.target.value }))}
            disabled={lockIdentity}
            sx={{
              borderRadius: '12px',
              backgroundColor: '#fafbfc',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000435', borderWidth: 2 },
            }}
          >
            {termOptionsForTemplate(settings?.terms).map((term) => (
              <MenuItem key={term} value={term}>
                {term === ANNUAL_TEMPLATE_TERM ? 'Annual (all terms)' : term}
              </MenuItem>
            ))}
          </Select>
          {errors.term && (
            <Typography variant="caption" sx={{ color: '#ef4444', ml: 1.5, mt: 0.5 }}>
              {errors.term}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: '#64748b', ml: 1.5, mt: 0.5, display: 'block' }}>
            Choose <strong>Annual</strong> to use the same structure for Term 1, Term 2, and Term 3 in TichaPortal.
          </Typography>
        </FormControl>
      </Box>
    </Box>
  );
}

function activeWeightSum(components: ComponentEntry[]) {
  return components.reduce((sum, c) => {
    if (c.isActive === false) return sum;
    return sum + (parseFloat(c.weight) || 0);
  }, 0);
}

export function Step2({
  components,
  setComponents,
  errors,
}: {
  components: ComponentEntry[];
  setComponents: React.Dispatch<React.SetStateAction<ComponentEntry[]>>;
  errors: FormErrors;
}) {
  const totalWeight = activeWeightSum(components);
  const filledCount = components.filter((c) => c.name.trim()).length;
  const isValid = totalWeight === 100 && filledCount > 0;
  const isOver = totalWeight > 100;

  const addComponent = () => {
    setComponents((prev) => [...prev, { name: '', weight: '', required: true, isActive: true }]);
  };

  const removeComponent = (index: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof ComponentEntry, value: any) => {
    setComponents((prev) => {
      const next = prev.map((c, i) => (i === index ? { ...c, [field]: value } : c));
      if (field === 'weight') {
        const row = next[index];
        if (row?.isActive !== false) {
          const others = next.reduce((sum, c, i) => {
            if (i === index || c.isActive === false) return sum;
            return sum + (parseFloat(c.weight) || 0);
          }, 0);
          const max = Math.max(0, 100 - others);
          const w = parseFloat(String(value));
          if (!Number.isNaN(w) && w > max) {
            next[index] = { ...row, weight: String(max) };
          }
        }
      }
      return next;
    });
  };

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(252,176,56,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SummarizeIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#000435', lineHeight: 1.2 }}>
              Assessment Components
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Define the grading categories and their weight in the final result
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 18 }} />}
          onClick={addComponent}
          sx={{
            background: 'linear-gradient(135deg, #FCB038 0%, #f59e0b 100%)',
            color: '#000435',
            fontWeight: 700,
            borderRadius: '10px',
            textTransform: 'none',
            px: 2.5,
            boxShadow: '0 4px 12px rgba(252,176,56,0.3)',
            '&:hover': { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 6px 16px rgba(252,176,56,0.4)' },
          }}
        >
          Add Component
        </Button>
      </Box>

      {errors.components && (
        <Box sx={{ p: 1.5, mb: 2, bgcolor: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
          <Typography variant="body2" sx={{ color: '#dc2626', fontSize: '0.8125rem', fontWeight: 500 }}>
            {errors.components}
          </Typography>
        </Box>
      )}

      {components.length > 0 && (
        <Box sx={{
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          overflow: 'hidden',
          bgcolor: '#ffffff',
        }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr">
                {['#', 'Assessment Component', 'Code', 'Weight %', 'Required', 'Active', ''].map((h, i) => (
                  <Box
                    key={h || i}
                    component="th"
                    sx={{
                      textAlign: h === '#' ? 'center' : h === 'Weight %' ? 'right' : 'left',
                      py: 1.5,
                      px: 2,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '2px solid #e2e8f0',
                      bgcolor: '#f8fafc',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {components.map((comp, index) => {
                const code = generateCode(comp.name);
                return (
                  <Box component="tr" key={index} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <Box component="td" sx={{ textAlign: 'center', py: 1.25, px: 2, fontSize: '0.8125rem', color: '#94a3b8', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>
                      {index + 1}
                    </Box>
                    <Box component="td" sx={{ py: 0.75, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      <TextField
                        placeholder="e.g. Continuous Assessment"
                        size="small"
                        required
                        fullWidth
                        value={comp.name}
                        onChange={(e) => updateComponent(index, 'name', e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem' } }}
                      />
                    </Box>
                    <Box component="td" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f1f5f9' }}>
                      {code ? (
                        <Chip
                          label={code}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            height: 24,
                            fontSize: '0.6875rem',
                            bgcolor: 'rgba(0,4,53,0.05)',
                            color: '#000435',
                            borderRadius: '6px',
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: '0.75rem', color: '#cbd5e1' }}>—</Typography>
                      )}
                    </Box>
                    <Box component="td" sx={{ py: 0.75, px: 2, borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      <TextField
                        size="small"
                        type="number"
                        required
                        placeholder="0"
                        value={comp.weight}
                        onChange={(e) => updateComponent(index, 'weight', e.target.value)}
                        inputProps={{ min: 0, max: 100, style: { textAlign: 'right', fontSize: '0.8125rem', fontWeight: 600 } }}
                        sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      />
                    </Box>
                    <Box component="td" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <Tooltip title={comp.required ? 'Required — included in all assessments' : 'Optional — can be excluded'}>
                        <Switch
                          size="small"
                          checked={comp.required}
                          onChange={(e) => updateComponent(index, 'required', e.target.checked)}
                          color="warning"
                        />
                      </Tooltip>
                    </Box>
                    <Box component="td" sx={{ py: 1.25, px: 2, borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <Tooltip title={comp.isActive !== false ? 'Visible in TichaPortal' : 'Hidden from mark entry'}>
                        <Switch
                          size="small"
                          checked={comp.isActive !== false}
                          onChange={(e) => updateComponent(index, 'isActive', e.target.checked)}
                          color="primary"
                        />
                      </Tooltip>
                    </Box>
                    <Box component="td" sx={{ py: 1.25, px: 1, borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <IconButton
                        size="small"
                        onClick={() => removeComponent(index)}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' } }}
                      >
                        <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {components.length === 0 && (
        <Box sx={{
          textAlign: 'center',
          py: 8,
          border: '2px dashed #e2e8f0',
          borderRadius: '14px',
          bgcolor: '#fafbfc',
        }}>
          <SummarizeIcon sx={{ fontSize: 40, color: '#cbd5e1', mb: 1.5 }} />
          <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: 500 }}>
            No components added yet
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#cbd5e1', mt: 0.5 }}>
            Click &quot;Add Component&quot; to start defining assessment categories
          </Typography>
        </Box>
      )}

      {components.length > 0 && (
        <Box sx={{
          mt: 3,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '12px',
          border: isOver ? '1px solid #fecaca' : isValid ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
          bgcolor: isOver ? '#fef2f2' : isValid ? '#f0fdf4' : '#f8fafc',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>
              Active weight total:
            </Typography>
            <Chip
              label={`${totalWeight}%`}
              size="small"
              sx={{
                fontWeight: 700,
                height: 26,
                fontSize: '0.8125rem',
                bgcolor: isOver ? '#fef2f2' : isValid ? 'rgba(34,197,94,0.1)' : 'rgba(0,4,53,0.05)',
                color: isOver ? '#dc2626' : isValid ? '#16a34a' : '#000435',
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isValid ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                <Typography sx={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
                  Valid Assessment Structure
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ fontSize: '0.75rem', color: isOver ? '#dc2626' : '#94a3b8', fontWeight: 500 }}>
                {isOver ? `Exceeds 100% by ${totalWeight - 100}%` : `Needs ${100 - totalWeight}% more`}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box sx={{ mt: 2.5, p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1, bgcolor: 'rgba(0,4,53,0.02)', borderRadius: '10px' }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: '#94a3b8', mt: 0.15, flexShrink: 0 }} />
        <Typography sx={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
          <strong>How it works:</strong> Define the assessment categories and their weight percentage. The total must equal exactly 100%. Max marks are set per assessment when the teacher creates individual tests/exams. The system converts raw marks into weighted contributions automatically.
        </Typography>
      </Box>
    </Box>
  );
}

export function Step3({
  formData,
  components,
}: {
  formData: {
    name: string;
    description: string;
    academicLevel: string;
    academicYear: string;
    term: string;
    defaultCourseMarks?: string;
  };
  components: ComponentEntry[];
}) {
  const totalWeight = activeWeightSum(components);
  const levelLabel = ACADEMIC_LEVELS.find((l) => l.value === formData.academicLevel)?.label ?? formData.academicLevel;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 20, color: '#16a34a' }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#000435', lineHeight: 1.2 }}>
            Review & Create
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Verify everything looks correct before creating
          </Typography>
        </Box>
      </Box>

      <Box sx={{
        mb: 3,
        p: 3,
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
      }}>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
          Template Details
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500, mb: 0.25 }}>Name</Typography>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>{formData.name}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500, mb: 0.25 }}>Academic Level</Typography>
            <Chip label={levelLabel} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(0,4,53,0.05)', color: '#000435' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500, mb: 0.25 }}>Academic Year</Typography>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>{formData.academicYear}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500, mb: 0.25 }}>Term</Typography>
            <Chip label={termDisplayLabel(formData.term)} size="small" sx={{ fontWeight: 600, bgcolor: 'rgba(245,158,11,0.08)', color: '#d97706' }} />
          </Box>
          {formData.description && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500, mb: 0.25 }}>Description</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>{formData.description}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{
        p: 3,
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
      }}>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2 }}>
          Assessment Components ({components.length})
        </Typography>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <Box component="thead">
            <Box component="tr">
              {['#', 'Assessment Component', 'Code', 'Weight', 'Required', 'Active'].map((h) => (
                <Box
                  key={h}
                  component="th"
                  sx={{
                    textAlign: h === '#' ? 'center' : h === 'Weight' ? 'right' : 'left',
                    py: 1.25,
                    px: 1.5,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #e2e8f0',
                    bgcolor: '#f8fafc',
                    '&:first-of-type': { borderRadius: '8px 0 0 0' },
                    '&:last-of-type': { borderRadius: '0 8px 0 0' },
                  }}
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {components.filter((comp) => comp.name.trim()).map((comp, index) => {
              const code = generateCode(comp.name);
              return (
                <Box component="tr" key={comp.id ?? index} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                  <Box component="td" sx={{ textAlign: 'center', py: 1.25, px: 1.5, fontSize: '0.8125rem', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{index + 1}</Box>
                  <Box component="td" sx={{ py: 1.25, px: 1.5, fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>{comp.name}</Box>
                  <Box component="td" sx={{ py: 1.25, px: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                    <Chip label={code} size="small" sx={{ fontWeight: 600, height: 22, bgcolor: 'rgba(0,4,53,0.04)', fontSize: '0.6875rem' }} />
                  </Box>
                  <Box component="td" sx={{ textAlign: 'right', py: 1.25, px: 1.5, fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
                    {comp.weight || '—'}%
                  </Box>
                  <Box component="td" sx={{ py: 1.25, px: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                    <Chip
                      label={comp.required ? 'Required' : 'Optional'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        height: 22,
                        fontSize: '0.6875rem',
                        bgcolor: comp.required ? 'rgba(34,197,94,0.08)' : 'rgba(148,163,184,0.12)',
                        color: comp.required ? '#16a34a' : '#64748b',
                      }}
                    />
                  </Box>
                  <Box component="td" sx={{ py: 1.25, px: 1.5, borderBottom: '1px solid #f1f5f9' }}>
                    <Chip
                      label={comp.isActive !== false ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        height: 22,
                        fontSize: '0.6875rem',
                        bgcolor: comp.isActive !== false ? 'rgba(59,130,246,0.08)' : 'rgba(148,163,184,0.12)',
                        color: comp.isActive !== false ? '#2563eb' : '#64748b',
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
            <Box component="tr" sx={{ bgcolor: '#f8fafc' }}>
              <Box component="td" colSpan={3} sx={{ py: 1.5, px: 1.5, fontSize: '0.8125rem', fontWeight: 700, color: '#000435', borderBottom: '2px solid #e2e8f0' }}>Active total</Box>
              <Box component="td" sx={{ textAlign: 'right', py: 1.5, px: 1.5, fontSize: '0.875rem', fontWeight: 700, color: totalWeight === 100 ? '#16a34a' : '#dc2626', borderBottom: '2px solid #e2e8f0' }}>
                {totalWeight}%
              </Box>
              <Box component="td" sx={{ py: 1.5, px: 1.5, borderBottom: '2px solid #e2e8f0' }} />
            </Box>
          </Box>
        </Box>

        {totalWeight === 100 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 18, color: '#16a34a' }} />
            <Typography sx={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
              Valid Assessment Structure
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export interface NewAssessmentTemplateWizardProps {
  embedded?: boolean;
  onClose?: () => void;
  onCreated?: (templateId: string) => void;
}

export function NewAssessmentTemplateWizard({ embedded, onClose, onCreated }: NewAssessmentTemplateWizardProps = {}) {
  const navigate = useNavigate();
  const { settings } = useAcademicSettings();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    academicLevel: '',
    academicYear: '',
    term: '',
    defaultCourseMarks: '40',
  });

  const [components, setComponents] = useState<ComponentEntry[]>([
    { name: '', weight: '', required: true, isActive: true },
  ]);

  useEffect(() => {
    if (settings) {
      setFormData((prev) => ({
        ...prev,
        academicYear: prev.academicYear || settings.currentAcademicYear || '',
        term: prev.term || settings.currentTerm || '',
      }));
    }
  }, [settings]);

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Template name is required';
    if (!formData.academicLevel) newErrors.academicLevel = 'Education level is required';
    if (!formData.academicYear) newErrors.academicYear = 'Academic year is required';
    if (!formData.term) newErrors.term = 'Term is required';
    const dcm = parseFloat(formData.defaultCourseMarks);
    if (!formData.defaultCourseMarks || Number.isNaN(dcm) || dcm <= 0) {
      newErrors.defaultCourseMarks = 'Default course marks must be greater than 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};
    const filledComponents = components.filter((c) => c.name.trim());
    if (filledComponents.length === 0) {
      newErrors.components = 'At least one component is required';
      setErrors(newErrors);
      return false;
    }

    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (!c.name.trim()) { newErrors.components = `Component ${i + 1}: Name is required`; break; }
      if (!c.weight || parseFloat(c.weight) <= 0) { newErrors.components = `Component ${i + 1}: Weight must be greater than 0`; break; }
      if (parseFloat(c.weight) > 100) { newErrors.components = `Component ${i + 1}: Weight cannot exceed 100%`; break; }
    }

    if (!newErrors.components) {
      const totalWeight = activeWeightSum(components.filter((c) => c.name.trim()));
      if (totalWeight > 100) {
        newErrors.components = `Active weights cannot exceed 100% (currently ${totalWeight}%)`;
      } else if (totalWeight !== 100) {
        newErrors.components = `Active weights must equal exactly 100% (currently ${totalWeight}%)`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) { setCurrentStep(2); setErrors({}); }
    else if (currentStep === 2 && validateStep2()) { setCurrentStep(3); setErrors({}); }
  };

  const handleBack = () => {
    if (currentStep > 1) { setCurrentStep((prev) => prev - 1); setErrors({}); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const created = await createAssessmentTemplate({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        academicLevel: formData.academicLevel,
        academicYear: formData.academicYear,
        term: formData.term,
        defaultCourseMarks: parseFloat(formData.defaultCourseMarks) || 40,
        components: components
          .filter((c) => c.name.trim())
          .map((c, idx) => ({
            name: c.name.trim(),
            code: generateCode(c.name),
            maxMark: 0,
            weightPercentage: parseFloat(c.weight) || 0,
            sortOrder: idx,
            required: c.required,
            isActive: c.isActive !== false,
          })),
      });
      if (onCreated) onCreated(created.id);
      else {
        navigate('/assessment-templates');
        toast.success('Template created as draft');
      }
    } catch (err: any) {
      setErrors({
        components: err?.response?.data?.message || err?.message || 'Failed to create template.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        height: embedded ? '100%' : '100%',
        minHeight: embedded ? 0 : undefined,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: embedded ? '#fff' : '#f4f6f9',
        overflow: 'hidden',
      }}
    >
      {!embedded ? (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          px: 3,
          bgcolor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          gap: 1.5,
          flexShrink: 0,
        }}>
          <IconButton component={Link} to="/assessment-templates" size="small" sx={{ color: '#64748b' }}>
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#000435' }}>
            New Assessment Template
          </Typography>
        </Box>
      ) : null}

      <Box sx={{ flex: 1, p: embedded ? { xs: 0, sm: 0 } : { xs: 2, md: 4 }, overflow: 'auto' }}>
        <StepIndicator currentStep={currentStep} />

        {currentStep === 1 && (
          <Step1 formData={formData} setFormData={setFormData} errors={errors} settings={settings} />
        )}
        {currentStep === 2 && (
          <Step2 components={components} setComponents={setComponents} errors={errors} />
        )}
        {currentStep === 3 && (
          <Step3 formData={formData} components={components} />
        )}
      </Box>

      <Box sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 1.5,
        p: embedded ? 2 : 2.5,
        px: embedded ? 0 : 3,
        bgcolor: embedded ? 'transparent' : '#ffffff',
        borderTop: embedded ? 'none' : '1px solid #e2e8f0',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {embedded && onClose ? (
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ mr: 'auto', borderColor: '#e2e8f0', color: '#64748b', fontWeight: 600, borderRadius: '10px', textTransform: 'none' }}
          >
            Cancel
          </Button>
        ) : null}
        {currentStep > 1 && (
          <Button
            variant="outlined"
            onClick={handleBack}
            sx={{
              borderColor: '#e2e8f0',
              color: '#475569',
              fontWeight: 600,
              borderRadius: '10px',
              textTransform: 'none',
              px: 3,
              '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
            }}
          >
            Back
          </Button>
        )}
        {currentStep < 3 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            sx={{
              background: 'linear-gradient(135deg, #000435 0%, #000650 100%)',
              fontWeight: 700,
              borderRadius: '10px',
              textTransform: 'none',
              px: 3,
              boxShadow: '0 4px 14px rgba(0,4,53,0.2)',
              '&:hover': { background: 'linear-gradient(135deg, #000650 0%, #000870 100%)', boxShadow: '0 6px 18px rgba(0,4,53,0.3)' },
            }}
          >
            Next Step
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{
              background: submitting ? '#e2e8f0' : 'linear-gradient(135deg, #FCB038 0%, #f59e0b 100%)',
              color: submitting ? '#94a3b8' : '#000435',
              fontWeight: 700,
              borderRadius: '10px',
              textTransform: 'none',
              px: 3,
              boxShadow: submitting ? 'none' : '0 4px 14px rgba(252,176,56,0.35)',
              '&:hover': { background: submitting ? '#e2e8f0' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
            }}
          >
            {submitting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: '#94a3b8' }} />
                Creating...
              </Box>
            ) : 'Create Template'}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default function NewAssessmentTemplatePage() {
  return <NewAssessmentTemplateWizard />;
}
