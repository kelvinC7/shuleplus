'use client';

import { useState, type ReactNode } from 'react';
import ButtonBase from '@mui/material/ButtonBase';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import { brand } from '@/theme/theme';

const fieldShellSx = {
  bgcolor: '#F2F4F8',
  borderRadius: 2,
  px: 1.75,
  py: 1,
  fontSize: 15.5,
  color: brand.navy,
  border: '1.5px solid transparent',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  '&:hover': { bgcolor: '#EDF0F6' },
  '&.Mui-focused': { bgcolor: '#fff', borderColor: brand.primary },
  '& input, & textarea': {
    fontSize: 15.5,
    '&::placeholder': { color: '#98A2B3', opacity: 1 },
  },
} as const;

export function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline,
  minRows = 3,
  maxLength,
  helper,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  minRows?: number;
  maxLength?: number;
  helper?: string;
  autoFocus?: boolean;
}) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted }}>{label}</Typography>
        {maxLength ? (
          <Typography sx={{ fontSize: 11.5, color: brand.muted }}>
            {value.length}/{maxLength}
          </Typography>
        ) : null}
      </Box>
      <InputBase
        fullWidth
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        multiline={multiline}
        minRows={multiline ? minRows : undefined}
        maxRows={multiline ? 10 : undefined}
        autoFocus={autoFocus}
        inputProps={{ maxLength, 'aria-label': label }}
        sx={fieldShellSx}
      />
      {helper ? (
        <Typography sx={{ mt: 0.6, fontSize: 11.5, color: brand.muted, lineHeight: 1.4 }}>{helper}</Typography>
      ) : null}
    </Box>
  );
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  helper?: string;
}) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted, mb: 0.5 }}>{label}</Typography>
      <TextField
        select
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: '#F2F4F8',
            borderRadius: 2,
            fontSize: 15.5,
            transition: 'border-color 120ms ease, background-color 120ms ease',
            '& fieldset': { borderColor: 'transparent' },
            '&:hover': { bgcolor: '#EDF0F6' },
            '&:hover fieldset': { borderColor: 'transparent' },
            '&.Mui-focused': { bgcolor: '#fff' },
            '&.Mui-focused fieldset': { borderColor: brand.primary, borderWidth: 2 },
          },
          '& .MuiSelect-select': { py: 1.2 },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      {helper ? (
        <Typography sx={{ mt: 0.6, fontSize: 11.5, color: brand.muted, lineHeight: 1.4 }}>{helper}</Typography>
      ) : null}
    </Box>
  );
}

export function FormRow({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 1.5 }}>
      {children}
    </Box>
  );
}

export function FormFooterButton({
  children,
  onClick,
  disabled,
  startIcon,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  startIcon?: ReactNode;
}) {
  return (
    <Button
      fullWidth
      onClick={onClick}
      disabled={disabled}
      startIcon={startIcon}
      sx={{
        py: 1.15,
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 14.5,
        textTransform: 'none',
        bgcolor: brand.primary,
        color: brand.navy,
        '&:hover': { bgcolor: brand.primaryStrong },
        '&.Mui-disabled': { bgcolor: '#E9ECF2', color: brand.muted },
      }}
    >
      {children}
    </Button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Typography role="alert" sx={{ mb: 1.25, fontSize: 12.5, fontWeight: 600, color: brand.danger, textAlign: 'center' }}>
      {message}
    </Typography>
  );
}

export function FormLabel({ children }: { children: ReactNode }) {
  return <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: brand.muted, mb: 0.75 }}>{children}</Typography>;
}

/** Pill segmented switch (e.g. Post / Page / Profile in Yo Info). */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <Box sx={{ display: 'flex', bgcolor: '#F2F4F8', borderRadius: 999, p: 0.5, mb: 2 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <ButtonBase
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            sx={{
              flex: 1,
              py: 0.8,
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              bgcolor: active ? '#fff' : 'transparent',
              color: active ? brand.navy : brand.muted,
              boxShadow: active ? '0 1px 4px rgba(0,4,53,0.12)' : 'none',
            }}
          >
            {o.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** Single- or multi-select pill chips. */
export function ChipSelect({
  label,
  options,
  value,
  onChange,
  multiple,
  helper,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string | string[];
  onChange: (value: string) => void;
  multiple?: boolean;
  helper?: string;
}) {
  const isOn = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <Box sx={{ mb: 1.75 }}>
      <FormLabel>{label}</FormLabel>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {options.map((o) => (
          <ButtonBase
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={isOn(o.value)}
            sx={{
              px: 1.5,
              py: 0.6,
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              bgcolor: isOn(o.value) ? brand.navy : '#F2F4F8',
              color: isOn(o.value) ? '#fff' : brand.navy,
              transition: 'background-color 120ms ease',
            }}
          >
            {o.label}
          </ButtonBase>
        ))}
      </Box>
      {helper ? <Typography sx={{ mt: 0.6, fontSize: 11.5, color: brand.muted, lineHeight: 1.4 }}>{helper}</Typography> : null}
    </Box>
  );
}

/** Type a name and press Enter or comma to add it as a removable chip. */
export function TagInput({
  label,
  values,
  onChange,
  placeholder,
  suggestions = [],
  helper,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  helper?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const next = raw.trim();
    if (!next || values.some((v) => v.toLowerCase() === next.toLowerCase())) return;
    onChange([...values, next]);
  };
  const commit = () => {
    add(draft);
    setDraft('');
  };
  const remaining = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <Box sx={{ mb: 1.75 }}>
      <FormLabel>{label}</FormLabel>
      {values.length ? (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
          {values.map((v) => (
            <ButtonBase
              key={v}
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              sx={{ pl: 1.5, pr: 1.1, py: 0.5, borderRadius: 999, fontSize: 13, fontWeight: 700, bgcolor: brand.navy, color: '#fff', gap: 0.5 }}
            >
              {v}
              <Box component="span" sx={{ opacity: 0.6, fontSize: 15, lineHeight: 1 }}>
                ×
              </Box>
            </ButtonBase>
          ))}
        </Box>
      ) : null}
      <InputBase
        fullWidth
        value={draft}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(',')) {
            add(v.slice(0, -1));
            setDraft('');
          } else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={commit}
        inputProps={{ 'aria-label': label }}
        sx={fieldShellSx}
      />
      {remaining.length ? (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
          {remaining.map((s) => (
            <ButtonBase
              key={s}
              onClick={() => add(s)}
              sx={{ px: 1.25, py: 0.4, borderRadius: 999, fontSize: 12, fontWeight: 600, color: brand.muted, border: '1px dashed #C9CEDB' }}
            >
              + {s}
            </ButtonBase>
          ))}
        </Box>
      ) : null}
      {helper ? <Typography sx={{ mt: 0.6, fontSize: 11.5, color: brand.muted, lineHeight: 1.4 }}>{helper}</Typography> : null}
    </Box>
  );
}
