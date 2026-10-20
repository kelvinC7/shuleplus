import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  MenuItem,
  Collapse,
} from '@mui/material';
import { Add, DeleteOutlined, DragIndicator } from '@mui/icons-material';
import { ACCENT_BORDER, CARD, PRIMARY, SECTION_LABEL } from '../styles';
import {
  createAdmissionField,
  FIELD_TYPE_LABELS,
  type AdmissionFieldType,
  type AdmissionFormField,
} from '../admission-form';

interface AdmissionFormBuilderProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  info: string;
  onInfoChange: (value: string) => void;
  fields: AdmissionFormField[];
  onChange: (fields: AdmissionFormField[]) => void;
}

export function AdmissionFormBuilder({
  enabled,
  onEnabledChange,
  info,
  onInfoChange,
  fields,
  onChange,
}: AdmissionFormBuilderProps) {
  function updateField(index: number, patch: Partial<AdmissionFormField>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function addField(type: AdmissionFieldType = 'text') {
    onChange([...fields, createAdmissionField({ type, label: FIELD_TYPE_LABELS[type] })]);
  }

  return (
    <Box sx={{ mt: 1, ...CARD }}>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography sx={SECTION_LABEL}>Admissions</Typography>
          <Typography sx={{ color: 'rgba(0,0,0,0.35)', fontSize: '0.65rem', mt: 0.25 }}>
            Optional — turn on to show an application form on your public site
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              size="small"
              sx={{ '& .Mui-checked': { color: PRIMARY } }}
            />
          }
          label={<Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>Open admissions</Typography>}
        />
      </Box>

      <Collapse in={enabled}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label="Admissions information"
            variant="standard"
            multiline
            minRows={2}
            value={info}
            onChange={(e) => onInfoChange(e.target.value)}
            fullWidth
            size="small"
            sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
            <Typography sx={{ ...SECTION_LABEL, mb: 0 }}>Application form fields</Typography>
            <Button
              size="small"
              startIcon={<Add sx={{ fontSize: 15 }} />}
              onClick={() => addField('text')}
              sx={{
                color: PRIMARY,
                textTransform: 'none',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: `1px solid ${ACCENT_BORDER}`,
                borderRadius: '2px',
              }}
            >
              Add field
            </Button>
          </Box>

          {fields.map((field, index) => (
            <Box
              key={`${field.id}-${index}`}
              sx={{
                border: `1px solid ${ACCENT_BORDER}`,
                borderRadius: '4px',
                p: 1.25,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr auto' },
                gap: 1,
                alignItems: 'start',
                bgcolor: 'rgba(245,158,11,0.03)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, gridColumn: { md: '1 / -1' } }}>
                <DragIndicator sx={{ fontSize: 16, color: 'rgba(0,0,0,0.25)' }} />
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(0,0,0,0.45)' }}>
                  Field {index + 1}
                </Typography>
              </Box>
              <TextField
                label="Label"
                variant="standard"
                size="small"
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value, id: field.id || createAdmissionField({ label: e.target.value }).id })}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
              />
              <TextField
                select
                label="Type"
                variant="standard"
                size="small"
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value as AdmissionFieldType })}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
              >
                {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value} sx={{ fontSize: '0.75rem' }}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
              <IconButton
                size="small"
                onClick={() => removeField(index)}
                sx={{ color: '#dc2626', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '2px' }}
              >
                <DeleteOutlined sx={{ fontSize: 15 }} />
              </IconButton>
              <TextField
                label="Field key"
                variant="standard"
                size="small"
                value={field.id}
                onChange={(e) => updateField(index, { id: e.target.value.replace(/\s+/g, '_') })}
                helperText="Used when storing responses"
                sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
              />
              <TextField
                label="Placeholder"
                variant="standard"
                size="small"
                value={field.placeholder ?? ''}
                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(field.required)}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    size="small"
                  />
                }
                label={<Typography sx={{ fontSize: '0.72rem' }}>Required</Typography>}
              />
              {field.type === 'select' && (
                <TextField
                  label="Options (comma separated)"
                  variant="standard"
                  size="small"
                  value={(field.options ?? []).join(', ')}
                  onChange={(e) =>
                    updateField(index, {
                      options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  sx={{ gridColumn: '1 / -1', '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
                />
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
