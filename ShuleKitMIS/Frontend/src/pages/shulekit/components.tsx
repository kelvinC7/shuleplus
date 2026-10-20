import { useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Box, InputBase, IconButton, Typography, CircularProgress } from '@mui/material';
import { Search, ArrowDropDown, CloudUpload, DeleteOutlined } from '@mui/icons-material';
import { GLASS, ACCENT, PRIMARY, ACCENT_BORDER, BORDER, CARD_BG } from './styles';
import { uploadImage } from '@/services/api';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onFilterClick?: (event: MouseEvent<HTMLElement>) => void;
}

export function SearchInput({
  placeholder = 'Search...',
  value,
  onChange,
  onFilterClick,
}: SearchInputProps) {
  return (
    <Box
      sx={{
        minWidth: 320,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: GLASS,
        borderRadius: '2px',
        border: `1px solid ${ACCENT_BORDER}`,
      }}
    >
      <Box
        sx={{
          px: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(0,0,0,0.5)',
        }}
      >
        <Search sx={{ fontSize: 20 }} />
      </Box>
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        sx={{ color: PRIMARY, width: '100%', fontSize: '0.875rem', flex: 1 }}
      />
      {onFilterClick && (
        <IconButton
          onClick={onFilterClick}
          sx={{
            height: 36,
            width: 36,
            borderRadius: '0 2px 2px 0',
            bgcolor: 'rgba(245,158,11,0.1)',
            color: ACCENT,
            borderLeft: '1px solid rgba(0,0,0,0.05)',
            '&:hover': { bgcolor: 'rgba(245,158,11,0.2)' },
          }}
        >
          <ArrowDropDown />
        </IconButton>
      )}
    </Box>
  );
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: ReactNode;
  height?: number;
  maxWidth?: number;
}

export function ImageUpload({
  value,
  onChange,
  label,
  height = 140,
  maxWidth = 260,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Upload failed'
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <Box sx={{ maxWidth }}>
      {label && (
        <Typography
          sx={{ mb: 1, color: 'rgba(0,0,0,0.6)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}
        >
          {label}
        </Typography>
      )}
      <Box
        sx={{
          height,
          borderRadius: '2px',
          border: `1px solid ${BORDER}`,
          bgcolor: CARD_BG,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value ? (
          <Box
            component="img"
            src={value}
            alt="Upload preview"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <CloudUpload sx={{ fontSize: 36, color: 'rgba(0,0,0,0.2)' }} />
        )}
        {uploading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.75)',
            }}
          >
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <IconButton
          size="small"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          sx={{
            flex: 1,
            borderRadius: '2px',
            border: `1px solid ${ACCENT_BORDER}`,
            color: PRIMARY,
            fontSize: '0.7rem',
            fontWeight: 600,
            py: 0.5,
            gap: 0.5,
            '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' },
          }}
        >
          <CloudUpload sx={{ fontSize: 15 }} />
          {value ? 'Replace' : 'Upload image'}
        </IconButton>
        {value && (
          <IconButton
            size="small"
            onClick={() => onChange('')}
            disabled={uploading}
            sx={{ color: '#dc2626', border: `1px solid ${BORDER}`, borderRadius: '2px' }}
          >
            <DeleteOutlined sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>
      {error && (
        <Typography sx={{ color: '#dc2626', fontSize: '0.7rem', mt: 0.5 }}>{error}</Typography>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </Box>
  );
}
