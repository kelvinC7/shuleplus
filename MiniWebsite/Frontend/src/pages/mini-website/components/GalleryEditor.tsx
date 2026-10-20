import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  AddPhotoAlternateOutlined,
  ArrowDownward,
  ArrowUpward,
  CloudUpload,
  DeleteOutlined,
  PhotoLibraryOutlined,
} from '@mui/icons-material';
import { CARD, PRIMARY, ACCENT, SECTION_LABEL } from '../styles';
import { uploadImage } from '@/services/api';
import { createGalleryItem, galleryAlbums, type GalleryItem } from '@/lib/gallery';

interface GalleryEditorProps {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
}

const fieldSx = {
  '& .MuiInputBase-root': { fontSize: '0.72rem', minHeight: '30px' },
  '& .MuiInputLabel-root': { fontSize: '0.68rem' },
};

export function GalleryEditor({ items, onChange }: GalleryEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAlbum, setActiveAlbum] = useState('All');

  const albums = useMemo(() => ['All', ...galleryAlbums(items)], [items]);
  const visibleItems =
    activeAlbum === 'All' ? items : items.filter((item) => (item.album || 'General') === activeAlbum);

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded: GalleryItem[] = [];
      for (const file of files) {
        const url = await uploadImage(file);
        uploaded.push(createGalleryItem(url, activeAlbum === 'All' ? 'General' : activeAlbum));
      }
      onChange([...items, ...uploaded]);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to upload one or more images'
      );
    } finally {
      setUploading(false);
    }
  }

  function updateItem(index: number, patch: Partial<GalleryItem>) {
    onChange(items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, idx) => idx !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    onChange(copy);
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
          <Typography sx={SECTION_LABEL}>Photo gallery</Typography>
          <Typography sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.72rem', mt: 0.25 }}>
            Upload many photos, group them by album, and reorder for a polished public gallery.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: PRIMARY }}>
            {items.length} {items.length === 1 ? 'photo' : 'photos'}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={12} /> : <CloudUpload sx={{ fontSize: 15 }} />}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            sx={{
              color: PRIMARY,
              borderColor: 'rgba(0,17,33,0.25)',
              textTransform: 'none',
              fontSize: '0.72rem',
              fontWeight: 600,
            }}
          >
            {uploading ? 'Uploading…' : 'Upload photos'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {albums.map((album) => (
            <Button
              key={album}
              size="small"
              onClick={() => setActiveAlbum(album)}
              sx={{
                minWidth: 0,
                px: 1.25,
                py: 0.35,
                borderRadius: '999px',
                textTransform: 'none',
                fontSize: '0.68rem',
                fontWeight: 700,
                bgcolor: activeAlbum === album ? PRIMARY : '#fff',
                color: activeAlbum === album ? '#fff' : 'rgba(0,0,0,0.55)',
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': {
                  bgcolor: activeAlbum === album ? '#0d2a44' : 'rgba(245,158,11,0.08)',
                },
              }}
            >
              {album}
              {album !== 'All'
                ? ` (${items.filter((item) => (item.album || 'General') === album).length})`
                : ''}
            </Button>
          ))}
        </Box>

        {error ? (
          <Typography sx={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>{error}</Typography>
        ) : null}

        {items.length === 0 ? (
          <Box
            onClick={() => inputRef.current?.click()}
            sx={{
              border: '1px dashed rgba(0,17,33,0.18)',
              borderRadius: '12px',
              bgcolor: 'rgba(245,158,11,0.04)',
              py: 4,
              px: 2,
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <PhotoLibraryOutlined sx={{ fontSize: 34, color: ACCENT, mb: 1 }} />
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: PRIMARY }}>
              Build your school gallery
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.45)', mt: 0.5 }}>
              Drop photos here or click to upload multiple images at once.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 1.25,
            }}
          >
            {visibleItems.map((item) => {
              const index = items.findIndex((entry) => entry.id === item.id);
              const featured = index === 0;
              return (
                <Box
                  key={item.id}
                  sx={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    bgcolor: '#fff',
                    boxShadow: featured ? '0 12px 30px rgba(0,17,33,0.08)' : 'none',
                  }}
                >
                  <Box sx={{ position: 'relative', aspectRatio: featured ? '16/10' : '4/3', bgcolor: '#f3f4f6' }}>
                    <Box
                      component="img"
                      src={item.url}
                      alt={item.caption || 'Gallery photo'}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {featured ? (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          px: 1,
                          py: 0.25,
                          borderRadius: '999px',
                          bgcolor: ACCENT,
                          color: PRIMARY,
                          fontSize: '0.62rem',
                          fontWeight: 800,
                        }}
                      >
                        Cover photo
                      </Box>
                    ) : null}
                  </Box>
                  <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <TextField
                      size="small"
                      label="Caption"
                      value={item.caption ?? ''}
                      onChange={(e) => updateItem(index, { caption: e.target.value })}
                      sx={fieldSx}
                      fullWidth
                    />
                    <TextField
                      select
                      size="small"
                      label="Album"
                      value={item.album || 'General'}
                      onChange={(e) => updateItem(index, { album: e.target.value })}
                      sx={fieldSx}
                      fullWidth
                    >
                      {galleryAlbums(items).map((album) => (
                        <MenuItem key={album} value={album}>
                          {album}
                        </MenuItem>
                      ))}
                      <MenuItem value="Campus">Campus</MenuItem>
                      <MenuItem value="Events">Events</MenuItem>
                      <MenuItem value="Sports">Sports</MenuItem>
                      <MenuItem value="Classrooms">Classrooms</MenuItem>
                    </TextField>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 0.25 }}>
                        <IconButton size="small" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                          <ArrowUpward sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                        >
                          <ArrowDownward sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                      <IconButton size="small" onClick={() => removeItem(index)} sx={{ color: '#dc2626' }}>
                        <DeleteOutlined sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {items.length > 0 ? (
          <Button
            size="small"
            startIcon={<AddPhotoAlternateOutlined sx={{ fontSize: 15 }} />}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '0.72rem', color: PRIMARY }}
          >
            Add more photos
          </Button>
        ) : null}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </Box>
  );
}
