import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import type { ApiAssessmentComponent, AssessmentComponentCategory, ReportingStage } from '@/types';
import {
  addAssessmentTemplateComponent,
  deleteAssessmentTemplateComponent,
  updateAssessmentTemplateComponent,
} from '@/services/api';
import { toast } from '@/lib/toast';

const NAVY = '#000435';

export const COMPONENT_CATEGORY_OPTIONS: Array<{ value: AssessmentComponentCategory | ''; label: string }> = [
  { value: '', label: 'Not set' },
  { value: 'BEGINNING_TEST', label: 'Beginning Test' },
  { value: 'CAT_CONTINUOUS', label: 'CAT / Continuous' },
  { value: 'MIDTERM_TEST', label: 'Mid-Term Test' },
  { value: 'END_OF_TERM_EXAM', label: 'End-of-Term Exam' },
];

export const COMPONENT_STAGE_OPTIONS: Array<{ value: ReportingStage; label: string }> = [
  { value: 'UNASSIGNED', label: 'Not set (teacher chooses)' },
  { value: 'BEGINNING_TERM', label: 'Beginning Term report' },
  { value: 'MID_TERM', label: 'Mid-Term report' },
  { value: 'TERM_FINAL', label: 'Termly report (final)' },
];

/** Category implies a default reporting stage; CATs keep whatever the admin chose. */
export function defaultStageForCategory(category: string): ReportingStage {
  if (category === 'BEGINNING_TEST') return 'BEGINNING_TERM';
  if (category === 'MIDTERM_TEST') return 'MID_TERM';
  if (category === 'END_OF_TERM_EXAM') return 'TERM_FINAL';
  return 'UNASSIGNED';
}

function generateCode(name: string): string {
  if (!name.trim()) return '';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    const w = words[0];
    return w.length > 4 ? w.substring(0, 4).toUpperCase() : w.toUpperCase();
  }
  return words.map((w) => w.charAt(0).toUpperCase()).join('');
}

function activeWeightSum(components: ApiAssessmentComponent[], excludeId?: string) {
  return components.reduce((sum, c) => {
    if (c.id === excludeId) return sum;
    if (c.isActive === false) return sum;
    return sum + Number(c.weightPercentage ?? 0);
  }, 0);
}

function labelFor<T extends string>(options: Array<{ value: T | ''; label: string }>, value: string | null | undefined) {
  return options.find((o) => o.value === (value ?? ''))?.label ?? 'Not set';
}

type ComponentDraft = {
  name: string;
  code: string;
  weight: string;
  maxMark: string;
  sortOrder: string;
  required: boolean;
  active: boolean;
  category: AssessmentComponentCategory | '';
  stage: ReportingStage;
};

type Props = {
  templateId: string;
  components: ApiAssessmentComponent[];
  editable: boolean;
  onChanged: () => void | Promise<void>;
};

export default function TemplateComponentsEditor({ templateId, components, editable, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newCategory, setNewCategory] = useState<AssessmentComponentCategory | ''>('');
  const [newStage, setNewStage] = useState<ReportingStage>('UNASSIGNED');

  const sortedComponents = useMemo(
    () => [...components].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [components]
  );

  const totalActiveWeight = useMemo(() => activeWeightSum(components), [components]);
  const weightsOk = Math.round(totalActiveWeight * 100) / 100 === 100;
  const isOver = totalActiveWeight > 100;

  const refresh = async () => {
    await onChanged();
  };

  const handleToggleActive = async (c: ApiAssessmentComponent, next: boolean) => {
    setBusyId(c.id);
    try {
      const weight = Number(c.weightPercentage ?? 0);
      const other = activeWeightSum(components, c.id);
      if (next && other + weight > 100) {
        toast.error(`Cannot activate: active weights would exceed 100% (${other + weight}%)`);
        return;
      }
      await updateAssessmentTemplateComponent(c.id, { isActive: next });
      toast.success(next ? 'Component active in TichaPortal' : 'Component hidden from TichaPortal');
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveComponent = async (c: ApiAssessmentComponent, draft: ComponentDraft) => {
    const w = parseFloat(draft.weight);
    if (Number.isNaN(w) || w <= 0) {
      toast.error('Enter a valid weight %');
      return;
    }
    const other = activeWeightSum(components, c.id);
    if (draft.active && other + w > 100) {
      toast.error(`Active weights cannot exceed 100% (max ${100 - other}% for this row)`);
      return;
    }
    setBusyId(c.id);
    try {
      const maxM = parseFloat(draft.maxMark);
      const sort = parseInt(draft.sortOrder, 10);
      await updateAssessmentTemplateComponent(c.id, {
        name: draft.name.trim(),
        code: draft.code.trim() || c.code,
        weightPercentage: w,
        maxMark: Number.isNaN(maxM) ? undefined : maxM,
        sortOrder: Number.isNaN(sort) ? undefined : sort,
        required: draft.required,
        isActive: draft.active,
        assessmentCategory: draft.category || null,
        reportingStage: draft.stage,
      });
      toast.success('Component updated');
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not update component');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (c: ApiAssessmentComponent) => {
    if (!window.confirm(`Remove "${c.name}" from this template?`)) return;
    setBusyId(c.id);
    try {
      await deleteAssessmentTemplateComponent(c.id);
      toast.success('Component removed');
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not delete component');
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Enter a component name');
      return;
    }
    const w = parseFloat(newWeight);
    if (Number.isNaN(w) || w <= 0) {
      toast.error('Enter a valid weight %');
      return;
    }
    if (activeWeightSum(components) + w > 100) {
      toast.error('Active weights cannot exceed 100%');
      return;
    }
    setBusyId('new');
    try {
      await addAssessmentTemplateComponent(templateId, {
        name,
        code: generateCode(name) || 'CMP',
        weightPercentage: w,
        sortOrder: components.length,
        required: true,
        isActive: true,
        assessmentCategory: newCategory || null,
        reportingStage: newStage,
      });
      setNewName('');
      setNewWeight('');
      setNewCategory('');
      setNewStage('UNASSIGNED');
      toast.success('Component added');
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not add component');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, color: NAVY }}>Mark components</Typography>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: isOver ? '#dc2626' : weightsOk ? '#059669' : '#b45309' }}>
          Active weight: {totalActiveWeight}% {weightsOk ? '✓' : isOver ? '(over 100%)' : '(need 100%)'}
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, boxShadow: 'none', overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              {['Name', 'Code', 'Weight %', 'Category', 'Reports in', 'Required', 'Active', ''].map((h) => (
                <TableCell key={h || 'actions'} sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedComponents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ color: '#94a3b8', py: 3 }}>
                  No components yet.
                </TableCell>
              </TableRow>
            ) : (
              sortedComponents.map((c) => (
                <ComponentRow
                  key={c.id}
                  component={c}
                  editable={editable}
                  busy={busyId === c.id}
                  maxWeight={100 - activeWeightSum(components, c.id)}
                  onSave={(draft) => void handleSaveComponent(c, draft)}
                  onDelete={() => void handleDelete(c)}
                  onToggleActive={(next) => void handleToggleActive(c, next)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {editable ? (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            border: '1px dashed rgba(0,4,53,0.15)',
            bgcolor: '#fafbfc',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 100px 1fr 1fr auto' },
            gap: 1.5,
            alignItems: 'end',
          }}
        >
          <TextField label="New component name" size="small" value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth />
          <TextField
            label="Weight %"
            size="small"
            type="number"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            slotProps={{ htmlInput: { min: 1, max: Math.max(1, 100 - totalActiveWeight) } }}
          />
          <TextField
            select
            label="Category"
            size="small"
            value={newCategory}
            onChange={(e) => {
              const v = e.target.value as AssessmentComponentCategory | '';
              setNewCategory(v);
              setNewStage(defaultStageForCategory(v));
            }}
            fullWidth
          >
            {COMPONENT_CATEGORY_OPTIONS.map((o) => (
              <MenuItem key={o.value || 'none'} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Reports in"
            size="small"
            value={newStage}
            onChange={(e) => setNewStage(e.target.value as ReportingStage)}
            fullWidth
          >
            {COMPONENT_STAGE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={busyId === 'new' || totalActiveWeight >= 100}
            onClick={() => void handleAdd()}
            sx={{ bgcolor: NAVY, fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
          >
            Add
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}

function ComponentRow({
  component: c,
  editable,
  busy,
  maxWeight,
  onSave,
  onDelete,
  onToggleActive,
}: {
  component: ApiAssessmentComponent;
  editable: boolean;
  busy: boolean;
  maxWeight: number;
  onSave: (draft: ComponentDraft) => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const [name, setName] = useState(c.name);
  const [code, setCode] = useState(c.code ?? '');
  const [weight, setWeight] = useState(String(c.weightPercentage ?? 0));
  const [maxMark, setMaxMark] = useState(String(c.maxMark ?? 20));
  const [sortOrder, setSortOrder] = useState(String(c.sortOrder ?? 0));
  const [required, setRequired] = useState(c.isRequired !== false);
  const [active, setActive] = useState(c.isActive !== false);
  const [category, setCategory] = useState<AssessmentComponentCategory | ''>((c.assessmentCategory ?? '') as AssessmentComponentCategory | '');
  const [stage, setStage] = useState<ReportingStage>((c.reportingStage ?? 'UNASSIGNED') as ReportingStage);

  const originalCategory = (c.assessmentCategory ?? '') as string;
  const originalStage = (c.reportingStage ?? 'UNASSIGNED') as string;

  const dirty =
    name !== c.name ||
    code !== (c.code ?? '') ||
    weight !== String(c.weightPercentage ?? 0) ||
    maxMark !== String(c.maxMark ?? 20) ||
    sortOrder !== String(c.sortOrder ?? 0) ||
    required !== (c.isRequired !== false) ||
    active !== (c.isActive !== false) ||
    category !== originalCategory ||
    stage !== originalStage;

  if (!editable) {
    return (
      <TableRow sx={{ opacity: c.isActive === false ? 0.65 : 1, bgcolor: c.isActive === false ? '#f8fafc' : undefined }}>
        <TableCell sx={{ fontWeight: 600, color: NAVY }}>{c.name}</TableCell>
        <TableCell>{c.code}</TableCell>
        <TableCell>{c.weightPercentage ?? 0}%</TableCell>
        <TableCell>{labelFor(COMPONENT_CATEGORY_OPTIONS, c.assessmentCategory)}</TableCell>
        <TableCell>{labelFor(COMPONENT_STAGE_OPTIONS, c.reportingStage)}</TableCell>
        <TableCell>{c.isRequired !== false ? 'Yes' : 'No'}</TableCell>
        <TableCell>{c.isActive !== false ? 'Active' : 'Inactive'}</TableCell>
        <TableCell />
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <TextField size="small" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
      </TableCell>
      <TableCell>
        <TextField size="small" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} sx={{ width: 72 }} />
      </TableCell>
      <TableCell>
        <TextField
          size="small"
          type="number"
          value={weight}
          onChange={(e) => {
            const v = e.target.value;
            const n = parseFloat(v);
            if (!Number.isNaN(n) && active && n > maxWeight) setWeight(String(maxWeight));
            else setWeight(v);
          }}
          slotProps={{ htmlInput: { min: 0, max: active ? maxWeight : 100 } }}
          sx={{ width: 72 }}
        />
      </TableCell>
      <TableCell sx={{ minWidth: 150 }}>
        <TextField
          select
          size="small"
          value={category}
          onChange={(e) => {
            const v = e.target.value as AssessmentComponentCategory | '';
            setCategory(v);
            setStage(defaultStageForCategory(v));
          }}
          fullWidth
        >
          {COMPONENT_CATEGORY_OPTIONS.map((o) => (
            <MenuItem key={o.value || 'none'} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell sx={{ minWidth: 170 }}>
        <TextField select size="small" value={stage} onChange={(e) => setStage(e.target.value as ReportingStage)} fullWidth>
          {COMPONENT_STAGE_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </TableCell>
      <TableCell>
        <Switch size="small" checked={required} onChange={(e) => setRequired(e.target.checked)} />
      </TableCell>
      <TableCell>
        <Switch
          size="small"
          checked={active}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.checked;
            setActive(next);
            onToggleActive(next);
          }}
        />
      </TableCell>
      <TableCell align="right">
        <IconButton
          size="small"
          disabled={busy || !dirty}
          onClick={() => onSave({ name, code, weight, maxMark, sortOrder, required, active, category, stage })}
        >
          <SaveOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" disabled={busy} onClick={onDelete} sx={{ color: '#dc2626' }}>
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
