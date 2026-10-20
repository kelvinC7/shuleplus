import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Skeleton,
  CircularProgress,
  Chip,
  InputAdornment,
} from '@mui/material';
import { SaveOutlined, Public, Link as LinkIcon, Refresh, Block } from '@mui/icons-material';
import { CARD, SECTION_LABEL, PAGE_TITLE, PRIMARY, ACCENT, ACCENT_DARK, ACCENT_BORDER } from '../styles';
import {
  publishWebsite,
  unpublishWebsite,
  updateWebsiteSlug,
  regenerateWebsite,
} from '@/services/api';
import type { SchoolWebsite } from '@/types';

interface SettingsModuleProps {
  website: SchoolWebsite | null;
  loading: boolean;
  error: string | null;
  onSaved: () => void;
}

export function SettingsModule({ website, loading, error, onSaved }: SettingsModuleProps) {
  const [slug, setSlug] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prevWebsite, setPrevWebsite] = useState<SchoolWebsite | null>(null);

  if (website !== prevWebsite) {
    setPrevWebsite(website);
    setSlug(website?.slug ?? '');
  }

  function flash(msg: string, isError = false) {
    setMessage(isError ? null : msg);
    setErrorMsg(isError ? msg : null);
    window.setTimeout(() => {
      setMessage(null);
      setErrorMsg(null);
    }, 4000);
  }

  async function handleSaveSlug() {
    if (!website || !slug.trim() || slug.trim() === website.slug) return;
    setSavingSlug(true);
    setErrorMsg(null);
    try {
      const updated = await updateWebsiteSlug(slug.trim());
      setSlug(updated.slug);
      flash('Website address updated.');
      onSaved();
    } catch (err: unknown) {
      flash(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update website address',
        true
      );
    } finally {
      setSavingSlug(false);
    }
  }

  async function handleTogglePublish() {
    if (!website) return;
    setPublishing(true);
    setErrorMsg(null);
    try {
      if (website.status === 'PUBLISHED') {
        await unpublishWebsite();
        flash('Website unpublished.');
      } else {
        await publishWebsite();
        flash('Website published and live.');
      }
      onSaved();
    } catch (err: unknown) {
      flash(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update publish status',
        true
      );
    } finally {
      setPublishing(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setErrorMsg(null);
    try {
      await regenerateWebsite();
      flash('Public site regenerated.');
    } catch (err: unknown) {
      flash(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to regenerate site',
        true
      );
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h5" sx={{ ...PAGE_TITLE, mb: 3 }}>Settings</Typography>
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: '4px' }} />
        <Skeleton variant="rounded" height={160} sx={{ borderRadius: '4px', mt: 3 }} />
      </Box>
    );
  }

  if (!website) {
    return (
      <Box sx={{ ...CARD, p: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'rgba(0,0,0,0.5)' }}>
          {error ?? 'Unable to load settings.'}
        </Typography>
      </Box>
    );
  }

  const published = website.status === 'PUBLISHED';

  return (
    <Box sx={{ maxWidth: 820 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={PAGE_TITLE}>Settings</Typography>
        <Typography sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.8rem', mt: 0.5 }}>
          Manage your public site address and publication status.
        </Typography>
      </Box>

      {(message || errorMsg) && (
        <Box
          sx={{
            ...CARD,
            p: 1.5,
            mb: 3,
            borderColor: errorMsg ? 'rgba(220,38,38,0.35)' : 'rgba(16,185,129,0.35)',
          }}
        >
          <Typography sx={{ color: errorMsg ? '#dc2626' : '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
            {errorMsg ?? message}
          </Typography>
        </Box>
      )}

      {/* Publication status */}
      <Box sx={CARD}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={SECTION_LABEL}>Publication</Typography>
          <Chip
            size="small"
            label={published ? 'PUBLISHED' : website.status}
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: published ? '#047857' : 'rgba(0,0,0,0.45)',
              bgcolor: published ? '#d1fae5' : 'rgba(0,0,0,0.05)',
              borderRadius: '2px',
              letterSpacing: '0.04em',
            }}
          />
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
            <Public sx={{ fontSize: 18, color: 'rgba(0,0,0,0.35)' }} />
            <Typography sx={{ color: PRIMARY, fontSize: '0.85rem', fontWeight: 600, wordBreak: 'break-all' }}>
              {website.publicUrl ?? `https://{host}/${website.slug}`}
            </Typography>
          </Box>
          <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.75rem', mb: 2 }}>
            {published
              ? `Live since ${website.publishedAt ? new Date(website.publishedAt).toLocaleString() : 'now'}.`
              : 'Your site is saved as a draft and is not visible to the public yet.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={publishing ? <CircularProgress size={14} color="inherit" /> : published ? <Block sx={{ fontSize: 16 }} /> : <Public sx={{ fontSize: 16 }} />}
              onClick={handleTogglePublish}
              disabled={publishing}
              sx={{
                bgcolor: PRIMARY,
                color: '#fff',
                textTransform: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                '&:hover': { bgcolor: '#0d2a44' },
              }}
            >
              {publishing ? 'Working…' : published ? 'Unpublish' : 'Publish'}
            </Button>
            <Button
              variant="outlined"
              startIcon={regenerating ? <CircularProgress size={14} /> : <Refresh sx={{ fontSize: 16 }} />}
              onClick={handleRegenerate}
              disabled={regenerating}
              sx={{
                color: PRIMARY,
                borderColor: 'rgba(0,17,33,0.3)',
                textTransform: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
              }}
            >
              {regenerating ? 'Regenerating…' : 'Regenerate Site'}
            </Button>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 3, borderColor: ACCENT_BORDER }} />

      {/* Website address */}
      <Box sx={CARD}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <Typography sx={SECTION_LABEL}>Website Address</Typography>
        </Box>
        <Box sx={{ p: 2.5 }}>
          <TextField
            size="small"
            label="Address (slug)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            fullWidth
            helperText="Your public site is served at this address."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkIcon sx={{ fontSize: 15, color: 'rgba(0,0,0,0.35)' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="outlined"
            startIcon={<SaveOutlined sx={{ fontSize: 16 }} />}
            onClick={handleSaveSlug}
            disabled={savingSlug || !slug.trim() || slug.trim() === website.slug}
            sx={{
              mt: 2,
              color: PRIMARY,
              borderColor: ACCENT,
              textTransform: 'none',
              fontSize: '0.78rem',
              fontWeight: 600,
              '&:hover': { borderColor: ACCENT_DARK, bgcolor: 'rgba(245,158,11,0.06)' },
            }}
          >
            {savingSlug ? 'Saving…' : 'Save Address'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
