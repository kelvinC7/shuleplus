import { useCallback, useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import {
  StepIndicator,
  Step1,
  Step2,
  Step3,
  generateCode,
  type ComponentEntry,
} from '@/pages/NewAssessmentTemplatePage';
import {
  getAssessmentTemplate,
  syncAssessmentTemplateComponents,
  updateAssessmentTemplate,
} from '@/services/api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { educationLevelLabel } from '@/lib/education-levels';
import { toast } from '@/lib/toast';
import type { ApiAssessmentTemplate } from '@/types';

type FormErrors = {
  name?: string;
  academicLevel?: string;
  academicYear?: string;
  term?: string;
  defaultCourseMarks?: string;
  components?: string;
};

function activeWeightSum(components: ComponentEntry[]) {
  return components.reduce((sum, c) => {
    if (c.isActive === false || !c.name.trim()) return sum;
    return sum + (parseFloat(c.weight) || 0);
  }, 0);
}

export interface EditAssessmentTemplateWizardProps {
  templateId: string;
  embedded?: boolean;
  onClose?: () => void;
  onUpdated?: (template: ApiAssessmentTemplate) => void;
  onDeleted?: (templateId: string) => void;
}

export function EditAssessmentTemplateWizard({
  templateId,
  embedded,
  onClose,
  onUpdated,
  onDeleted,
}: EditAssessmentTemplateWizardProps) {
  const { settings } = useAcademicSettings();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<ApiAssessmentTemplate | null>(null);
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

  const [components, setComponents] = useState<ComponentEntry[]>([]);
  const [originalComponentIds, setOriginalComponentIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const data = await getAssessmentTemplate(templateId);
      setTemplate(data);
      setFormData({
        name: data.name ?? '',
        description: data.description ?? '',
        academicLevel: data.academicLevel ?? '',
        academicYear: data.academicYear ?? '',
        term: data.term ?? '',
        defaultCourseMarks: String(data.defaultCourseMarks ?? 40),
      });
      const rows = (data.components ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setOriginalComponentIds(rows.map((c) => c.id));
      setComponents(
        rows.map((c) => ({
          id: c.id,
          name: c.name,
          weight: String(c.weightPercentage ?? 0),
          required: c.isRequired !== false,
          isActive: c.isActive !== false,
        }))
      );
    } catch {
      toast.error('Template not found');
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [templateId, onClose]);

  useEffect(() => {
    void load();
  }, [load]);

  const isDraft = template?.status === 'DRAFT';
  const isActive = template?.status === 'ACTIVE';
  const canEdit = isDraft || isActive;

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
    const filled = components.filter((c) => c.name.trim());
    if (filled.length === 0) {
      newErrors.components = 'At least one component is required';
      setErrors(newErrors);
      return false;
    }
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (!c.name.trim()) continue;
      if (!c.weight || parseFloat(c.weight) <= 0) {
        newErrors.components = `${c.name}: weight must be greater than 0`;
        break;
      }
      if (parseFloat(c.weight) > 100) {
        newErrors.components = `${c.name}: weight cannot exceed 100%`;
        break;
      }
    }
    const totalWeight = activeWeightSum(components);
    if (!newErrors.components) {
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
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      setErrors({});
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      setErrors({});
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      setErrors({});
    }
  };

  const handleSave = async () => {
    if (!templateId || !canEdit || !validateStep1() || !validateStep2()) return;
    setSubmitting(true);
    try {
      const dcm = parseFloat(formData.defaultCourseMarks);
      const filled = components.filter((c) => c.name.trim());
      await updateAssessmentTemplate(
        templateId,
        {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          academicLevel: formData.academicLevel,
          academicYear: formData.academicYear,
          term: formData.term,
          defaultCourseMarks: Number.isNaN(dcm) || dcm <= 0 ? 40 : dcm,
        },
        { skipToast: true }
      );
      await syncAssessmentTemplateComponents(
        templateId,
        filled.map((c, i) => ({
          id: c.id,
          name: c.name.trim(),
          code: generateCode(c.name) || 'CMP',
          weightPercentage: parseFloat(c.weight) || 0,
          sortOrder: i,
          required: c.required,
          isActive: c.isActive !== false,
          maxMark: 0,
        })),
        { skipToast: true }
      );
      const refreshed = await getAssessmentTemplate(templateId);
      setTemplate(refreshed);
      setOriginalComponentIds((refreshed.components ?? []).map((c) => c.id));
      onUpdated?.(refreshed);
      toast.success('Template saved');
      onClose?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save template');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!template || !canEdit) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ color: '#64748b', mb: 2 }}>
          This template cannot be edited here ({template?.status ?? 'unknown'}).
        </Typography>
        {onClose ? (
          <Button onClick={onClose} sx={{ fontWeight: 700, textTransform: 'none' }}>
            Close
          </Button>
        ) : null}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
          {educationLevelLabel(template.academicLevel)} · {template.academicYear} · {template.term} · {template.status}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <StepIndicator currentStep={currentStep} />
        {currentStep === 1 && (
          <Step1
            formData={formData}
            setFormData={setFormData}
            errors={errors}
            settings={settings}
            lockIdentity={false}
          />
        )}
        {currentStep === 2 && <Step2 components={components} setComponents={setComponents} errors={errors} />}
        {currentStep === 3 && <Step3 formData={formData} components={components.filter((c) => c.name.trim())} />}
        {currentStep === 3 && isDraft ? (
          <Typography sx={{ mt: 2, fontSize: '0.8125rem', color: '#64748b', textAlign: 'center' }}>
            Save changes first, then approve from the templates list or contact DOS if approval is required before teachers use this in TichaPortal.
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 2, flexWrap: 'wrap' }}>
        {embedded && onClose ? (
          <Button onClick={onClose} sx={{ mr: 'auto', fontWeight: 600, textTransform: 'none', color: '#64748b' }}>
            Cancel
          </Button>
        ) : null}
        {currentStep > 1 && (
          <Button variant="outlined" onClick={handleBack} sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '10px' }}>
            Back
          </Button>
        )}
        {currentStep < 3 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            sx={{ bgcolor: '#000435', fontWeight: 700, textTransform: 'none', borderRadius: '10px', px: 3 }}
          >
            Next step
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={submitting}
            sx={{
              bgcolor: '#FCB038',
              color: '#000435',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: '10px',
              px: 3,
            }}
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </Box>
    </Box>
  );
}
