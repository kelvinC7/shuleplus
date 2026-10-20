import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Skeleton,
  CircularProgress,
  Collapse,
  MenuItem,
} from '@mui/material';
import {
  SaveOutlined,
  PublishOutlined,
  VisibilityOutlined,
  Add,
  DeleteOutlined,
  ExpandMore,
  Language,
  Refresh,
  OpenInNew,
} from '@mui/icons-material';
import { CARD, SECTION_LABEL, PAGE_TITLE, PRIMARY, ACCENT, ACCENT_BORDER, CUSTOM_SCROLLBAR } from '../styles';
import { ImageUpload } from '../components';
import { AdmissionFormBuilder } from './admission-form-builder';
import { normalizeAdmissionForm } from '../admission-form';
import {
  LocationPicker,
  buildAddressFromLocation,
  buildMapEmbedUrl,
  type LocationValue,
} from '../components/LocationPicker';
import {
  publishWebsite,
  previewWebsite,
  updateWebsite,
  updateWebsiteSlug,
  listPages,
  createPage,
  updatePage,
  deletePage,
} from '@/services/api';
import type { SchoolWebsite, WebsitePage } from '@/types';
import { normalizeGallery, type GalleryItem } from '@/lib/gallery';
import { normalizeLeaders } from '@/lib/leaders';
import { GalleryEditor } from '../components/GalleryEditor';
import { LeadersEditor } from '../components/LeadersEditor';
import {
  EDUCATION_LEVELS,
  SCHOOL_CATEGORIES,
  SCHOOL_PROGRAMS,
} from '@/lib/school-profile';

interface WebsiteEditorProps {
  website: SchoolWebsite | null;
  loading: boolean;
  error: string | null;
  onSaved: () => void;
}

interface StatRow {
  label: string;
  value: string;
}

interface ProgramRow {
  name: string;
  description: string;
}

interface NewsRow {
  title: string;
  date: string;
  excerpt: string;
}

function websitePayloadFromDraft(draft: SchoolWebsite) {
  return {
    title: draft.title,
    tagline: draft.tagline ?? '',
    heroTitle: draft.heroTitle ?? '',
    heroText: draft.heroText ?? '',
    heroImageUrl: draft.heroImageUrl ?? '',
    logoUrl: draft.logoUrl ?? '',
    primaryColor: draft.primaryColor,
    secondaryColor: draft.secondaryColor,
    email: draft.email ?? '',
    phone: draft.phone ?? '',
    address: draft.address ?? '',
    province: draft.province ?? '',
    district: draft.district ?? '',
    sector: draft.sector ?? '',
    cell: draft.cell ?? '',
    village: draft.village ?? '',
    schoolCategory: draft.schoolCategory ?? '',
    schoolProgram: draft.schoolProgram ?? '',
    educationLevels: draft.educationLevels ?? [],
    leaders: normalizeLeaders(draft.leaders),
    websiteUrl: draft.websiteUrl ?? '',
    about: draft.about ?? '',
    vision: draft.vision ?? '',
    mission: draft.mission ?? '',
    admissionInfo: draft.admissionInfo ?? '',
    admissionsEnabled: Boolean(draft.admissionsEnabled),
    admissionForm: draft.admissionForm ?? normalizeAdmissionForm(null),
    customCss: draft.customCss ?? '',
    stats: draft.stats ?? [],
    programs: draft.programs ?? [],
    news: draft.news ?? [],
    gallery: draft.gallery ?? [],
  };
}

// Small text field component with reduced size
const SmallTextField = (props: any) => (
  <TextField
    {...props}
    size="small"
    sx={{
      '& .MuiInputBase-root': {
        fontSize: '0.75rem',
        minHeight: '32px',
      },
      '& .MuiInputLabel-root': {
        fontSize: '0.7rem',
      },
      '& .MuiFormHelperText-root': {
        fontSize: '0.6rem',
        marginTop: '2px',
      },
      ...props.sx,
    }}
  />
);

export function WebsiteEditor({ website, loading, error, onSaved }: WebsiteEditorProps) {
  const [draft, setDraft] = useState<SchoolWebsite | null>(null);
  const [slug, setSlug] = useState('');
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prevWebsite, setPrevWebsite] = useState<SchoolWebsite | null>(null);

  if (website !== prevWebsite) {
    setPrevWebsite(website);
    setDraft(website);
    setSlug(website?.slug ?? '');
  }

  useEffect(() => {
    if (website) {
      void listPages()
        .then(setPages)
        .catch(() => {});
    }
  }, [website]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!draft || !draft.title?.trim()) {
        setPreviewHtml(null);
        return;
      }
      void previewWebsite({
        slug: slug.trim() || draft.slug,
        ...websitePayloadFromDraft(draft),
      })
        .then((r) => setPreviewHtml(r.html))
        .catch(() => {});
    }, 900);
    return () => window.clearTimeout(t);
  }, [draft, slug]);

  const set = <K extends keyof SchoolWebsite>(key: K, value: SchoolWebsite[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const dirty = useMemo(
    () => website && draft && JSON.stringify(website) !== JSON.stringify(draft),
    [website, draft]
  );

  function flash(message: string, isError = false) {
    setMessage(isError ? null : message);
    setErrorMsg(isError ? message : null);
    window.setTimeout(() => {
      setMessage(null);
      setErrorMsg(null);
    }, 4000);
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = websitePayloadFromDraft(draft);
      await updateWebsite(payload);
      if (slug.trim() && slug.trim() !== draft.slug) {
        const updated = await updateWebsiteSlug(slug.trim());
        setDraft(updated);
      }
      flash('Website saved.');
      onSaved();
    } catch (err: unknown) {
      flash(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to save website',
        true
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!draft) return;
    setPublishing(true);
    setErrorMsg(null);
    try {
      await handleSaveNoop(draft);
      const updated = await publishWebsite();
      setDraft(updated);
      setPreviewHtml(updated.html ?? null);
      flash('Website published and live on the public URL.');
      onSaved();
    } catch (err: unknown) {
      flash(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to publish website',
        true
      );
    } finally {
      setPublishing(false);
    }
  }

  async function handleSaveNoop(site: SchoolWebsite) {
    await updateWebsite(websitePayloadFromDraft(site));
  }

  async function handlePreview() {
    if (!draft) return;
    setPreviewing(true);
    try {
      const r = await previewWebsite({
        slug: slug.trim() || draft.slug,
        ...websitePayloadFromDraft(draft),
      });
      setPreviewHtml(r.html);
    } catch (err: unknown) {
      flash(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to generate preview',
        true
      );
    } finally {
      setPreviewing(false);
    }
  }

  // ── Pages ──────────────────────────────────────────────────────────────────
  const [newPage, setNewPage] = useState({ title: '', slug: '', content: '' });

  async function handleAddPage() {
    if (!newPage.title.trim()) {
      flash('Page title is required', true);
      return;
    }
    try {
      const created = await createPage({
        title: newPage.title,
        slug: newPage.slug || newPage.title,
        content: newPage.content,
        sortOrder: pages.length,
      });
      setPages((prev) => [...prev, created]);
      setNewPage({ title: '', slug: '', content: '' });
      flash('Page added.');
      onSaved();
    } catch (err: unknown) {
      flash(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to add page',
        true
      );
    }
  }

  async function handleSavePage(page: WebsitePage) {
    try {
      const updated = await updatePage(page.id, {
        title: page.title,
        slug: page.slug,
        content: page.content,
        sortOrder: page.sortOrder,
      });
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setExpandedPage(null);
      flash('Page updated.');
    } catch (err: unknown) {
      flash(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update page',
        true
      );
    }
  }

  async function handleDeletePage(page: WebsitePage) {
    try {
      await deletePage(page.id);
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      flash('Page deleted.');
    } catch (err: unknown) {
      flash(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to delete page',
        true
      );
    }
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h5" sx={{ ...PAGE_TITLE, mb: 3 }}>Website Editor</Typography>
        <Skeleton variant="rounded" height={240} sx={{ borderRadius: '4px' }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: '4px', mt: 3 }} />
      </Box>
    );
  }

  if (!draft) {
    return (
      <Box sx={{ ...CARD, p: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'rgba(0,0,0,0.5)' }}>
          {error ?? 'Unable to load the website editor.'}
        </Typography>
      </Box>
    );
  }

  const stats = draft.stats ?? [];
  const programs = draft.programs ?? [];
  const news = draft.news ?? [];
  const gallery = normalizeGallery(draft.gallery);
  const leaders = normalizeLeaders(draft.leaders, { forEditor: true });
  const educationLevels = draft.educationLevels ?? [];
  const admissionFields = normalizeAdmissionForm(draft.admissionForm);

  const setStat = (i: number, key: keyof StatRow, value: string) =>
    set('stats', stats.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  const setProgram = (i: number, key: keyof ProgramRow, value: string) =>
    set('programs', programs.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
  const setNews = (i: number, key: keyof NewsRow, value: string) =>
    set('news', news.map((n, idx) => (idx === i ? { ...n, [key]: value } : n)));
  const setGallery = (items: GalleryItem[]) => set('gallery', items);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, flexShrink: 0 }}>
        <Box>
          <Typography variant="h5" sx={{ ...PAGE_TITLE, fontSize: '1.15rem' }}>Website Editor</Typography>
          <Typography sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.75rem', mt: 0.25 }}>
            Design and publish your school's public website.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityOutlined sx={{ fontSize: 16 }} />}
            onClick={handlePreview}
            disabled={previewing}
            sx={{
              color: PRIMARY,
              borderColor: 'rgba(0,17,33,0.3)',
              textTransform: 'none',
              fontSize: '0.78rem',
              fontWeight: 600,
              '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
            }}
          >
            {previewing ? 'Previewing…' : 'Preview'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<SaveOutlined sx={{ fontSize: 16 }} />}
            onClick={handleSave}
            disabled={saving || !dirty}
            sx={{
              color: PRIMARY,
              borderColor: dirty ? ACCENT : 'rgba(0,17,33,0.2)',
              textTransform: 'none',
              fontSize: '0.78rem',
              fontWeight: 600,
              '&:hover': { borderColor: ACCENT, bgcolor: 'rgba(245,158,11,0.06)' },
            }}
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </Button>
          <Button
            variant="contained"
            startIcon={publishing ? <CircularProgress size={14} color="inherit" /> : <PublishOutlined sx={{ fontSize: 16 }} />}
            onClick={handlePublish}
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
            {publishing ? 'Publishing…' : draft.status === 'PUBLISHED' ? 'Update & Publish' : 'Publish'}
          </Button>
        </Box>
      </Box>

      {(message || errorMsg) && (
        <Box
          sx={{
            ...CARD,
            p: 1,
            mb: 1,
            borderColor: errorMsg ? 'rgba(220,38,38,0.35)' : 'rgba(16,185,129,0.35)',
          }}
        >
          <Typography sx={{ color: errorMsg ? '#dc2626' : '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
            {errorMsg ?? message}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          gap: 1,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* Live Preview */}
        <Box
          sx={{
            flex: { xs: 'none', md: '0 0 38%' },
            height: { xs: 420, md: 'auto' },
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            ...CARD,
            bgcolor: '#fff',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography sx={SECTION_LABEL}>Live Preview</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Button
                size="small"
                startIcon={<Refresh sx={{ fontSize: 15 }} />}
                onClick={handlePreview}
                disabled={previewing}
                sx={{ color: PRIMARY, textTransform: 'none', fontSize: '0.7rem', fontWeight: 600 }}
              >
                {previewing ? 'Refreshing…' : 'Refresh'}
              </Button>
              {draft.slug && (
                <IconButton
                  size="small"
                  onClick={() =>
                    window.open(`${window.location.origin}/${draft.slug}`, '_blank', 'noopener,noreferrer')
                  }
                  sx={{ color: 'rgba(0,0,0,0.4)' }}
                >
                  <OpenInNew sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, bgcolor: '#fff', position: 'relative', overflow: 'hidden' }}>
            {previewHtml ? (
              <iframe
                title="Website preview"
                srcDoc={previewHtml}
                style={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  {previewing
                    ? 'Generating preview…'
                    : 'Your live preview appears here as you type. Add a school name to get started.'}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Editor configs */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            ...CUSTOM_SCROLLBAR,
          }}
        >
          {/* Hero & Media */}
          <Box sx={{mt:1,...CARD}}>
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Typography sx={SECTION_LABEL}>Hero & Media</Typography>
            </Box>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <SmallTextField
                label="Hero title"
                variant="standard"
                value={draft.heroTitle ?? ''}
                onChange={(e) => set('heroTitle', e.target.value)}
                fullWidth
              />
              <SmallTextField
                label="Hero text"
                variant="standard"
                multiline
                minRows={2}
                value={draft.heroText ?? ''}
                onChange={(e) => set('heroText', e.target.value)}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <ImageUpload
                  label="Logo"
                  value={draft.logoUrl ?? ''}
                  onChange={(url) => set('logoUrl', url)}
                  height={88}
                  maxWidth={160}
                  allowUrl
                  urlPlaceholder="Or paste logo URL"
                />
                <ImageUpload
                  label="Hero image"
                  value={draft.heroImageUrl ?? ''}
                  onChange={(url) => set('heroImageUrl', url)}
                  height={88}
                  maxWidth={200}
                />
              </Box>
            </Box>
          </Box>

      {/* Content sections */}
      <Box sx={{mt:1,...CARD}}>
        <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <Typography sx={SECTION_LABEL}>Content</Typography>
        </Box>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SmallTextField
            label="About the school"
            variant="standard"
            multiline
            minRows={3}
            value={draft.about ?? ''}
            onChange={(e) => set('about', e.target.value)}
            fullWidth
          />
          <SmallTextField
            label="Vision"
            variant="standard"
            multiline
            minRows={2}
            value={draft.vision ?? ''}
            onChange={(e) => set('vision', e.target.value)}
            fullWidth
          />
          <SmallTextField
            label="Mission"
            variant="standard"
            multiline
            minRows={2}
            value={draft.mission ?? ''}
            onChange={(e) => set('mission', e.target.value)}
            fullWidth
          />
        </Box>
      </Box>

      <AdmissionFormBuilder
        enabled={Boolean(draft.admissionsEnabled)}
        onEnabledChange={(enabled) => set('admissionsEnabled', enabled)}
        info={draft.admissionInfo ?? ''}
        onInfoChange={(value) => set('admissionInfo', value)}
        fields={admissionFields}
        onChange={(fields) => set('admissionForm', fields)}
      />

      {/* Stats */}
      <ListEditor
        title="Highlight Stats"
        hint="Numbers shown in the stats bar (e.g. 950+ Happy Learners)."
        rows={stats}
        onAdd={() => set('stats', [...stats, { label: '', value: '' }])}
        onRemove={(i) => set('stats', stats.filter((_, idx) => idx !== i))}
        render={(row, i) => (
          <>
            <SmallTextField
              variant="standard"
              label="Value"
              value={row.value}
              onChange={(e) => setStat(i, 'value', e.target.value)}
              sx={{ flex: 1, minWidth: 110 }}
            />
            <SmallTextField
              variant="standard"
              label="Label"
              value={row.label}
              onChange={(e) => setStat(i, 'label', e.target.value)}
              sx={{ flex: 1.5, minWidth: 140 }}
            />
          </>
        )}
      />

      {/* Programs */}
      <ListEditor
        title="Academic Programs"
        hint="Shown in the Programs section (Nursery, Primary, O-Level, A-Level...)."
        rows={programs}
        onAdd={() => set('programs', [...programs, { name: '', description: '' }])}
        onRemove={(i) => set('programs', programs.filter((_, idx) => idx !== i))}
        render={(row, i) => (
          <>
            <SmallTextField
              variant="standard"
              label="Program name"
              value={row.name}
              onChange={(e) => setProgram(i, 'name', e.target.value)}
              sx={{ flex: 1, minWidth: 130 }}
            />
            <SmallTextField
              variant="standard"
              label="Description"
              value={row.description}
              onChange={(e) => setProgram(i, 'description', e.target.value)}
              sx={{ flex: 2, minWidth: 180 }}
            />
          </>
        )}
      />

      {/* News */}
      <ListEditor
        title="News & Announcements"
        hint="Posted on the News section of your site."
        rows={news}
        onAdd={() => set('news', [...news, { title: '', date: '', excerpt: '' }])}
        onRemove={(i) => set('news', news.filter((_, idx) => idx !== i))}
        render={(row, i) => (
          <>
            <SmallTextField
              variant="standard"
              label="Title"
              value={row.title}
              onChange={(e) => setNews(i, 'title', e.target.value)}
              sx={{ flex: 1.2, minWidth: 140 }}
            />
            <SmallTextField
              variant="standard"
              label="Date"
              value={row.date}
              onChange={(e) => setNews(i, 'date', e.target.value)}
              sx={{ flex: 0.6, minWidth: 100 }}
            />
            <SmallTextField
              variant="standard"
              label="Excerpt"
              value={row.excerpt}
              onChange={(e) => setNews(i, 'excerpt', e.target.value)}
              sx={{ flex: 2, minWidth: 180 }}
            />
          </>
        )}
      />

      {/* School profile (from onboarding) */}
      <Box sx={{ mt: 1, ...CARD }}>
        <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <Typography sx={SECTION_LABEL}>School profile</Typography>
          <Typography sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.72rem', mt: 0.25 }}>
            Category, program, and levels sync from onboarding on first publish.
          </Typography>
        </Box>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField
              select
              size="small"
              label="School category"
              value={draft.schoolCategory ?? ''}
              onChange={(e) => set('schoolCategory', e.target.value)}
              sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
              fullWidth
            >
              <MenuItem value="">Select category</MenuItem>
              {SCHOOL_CATEGORIES.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="School program"
              value={draft.schoolProgram ?? ''}
              onChange={(e) => set('schoolProgram', e.target.value)}
              sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
              fullWidth
            >
              <MenuItem value="">Select program</MenuItem>
              {SCHOOL_PROGRAMS.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(0,0,0,0.55)', mb: 0.75 }}>
              Education levels
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {EDUCATION_LEVELS.map((level) => {
                const active = educationLevels.includes(level);
                return (
                  <Button
                    key={level}
                    size="small"
                    onClick={() => {
                      const next = active
                        ? educationLevels.filter((item) => item !== level)
                        : [...educationLevels, level];
                      set('educationLevels', next);
                    }}
                    sx={{
                      minWidth: 0,
                      px: 1.25,
                      py: 0.35,
                      borderRadius: '999px',
                      textTransform: 'none',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      bgcolor: active ? PRIMARY : '#fff',
                      color: active ? '#fff' : 'rgba(0,0,0,0.55)',
                      border: '1px solid rgba(0,0,0,0.08)',
                    }}
                  >
                    {level}
                  </Button>
                );
              })}
            </Box>
          </Box>
          <SmallTextField
            variant="standard"
            label="Public website URL"
            value={draft.websiteUrl ?? ''}
            onChange={(e) => set('websiteUrl', e.target.value)}
            fullWidth
            helperText="Shown on the home page profile panel"
          />
        </Box>
      </Box>

      <LeadersEditor
        leaders={leaders}
        onChange={(items) => set('leaders', items)}
      />

      {/* Gallery */}
      <GalleryEditor items={gallery} onChange={setGallery} />

      {/* Custom CSS */}
      <Box sx={{mt:1,...CARD}}>
        <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <Typography sx={SECTION_LABEL}>Custom CSS</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <SmallTextField
            label="Extra styles (appended to the generated site)"
            variant="standard"
            multiline
            minRows={4}
            value={draft.customCss ?? ''}
            onChange={(e) => set('customCss', e.target.value)}
            fullWidth
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          />
        </Box>
      </Box>

      {/* Pages */}
      <Box sx={{mt:1,...CARD}}>
        <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={SECTION_LABEL}>Custom Pages</Typography>
          <Button
            size="small"
            startIcon={<Add sx={{ fontSize: 15 }} />}
            onClick={() => setExpandedPage('__new')}
            sx={{
              color: PRIMARY,
              textTransform: 'none',
              fontSize: '0.72rem',
              fontWeight: 600,
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: '2px',
              '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' },
            }}
          >
            Add Page
          </Button>
        </Box>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {expandedPage === '__new' && (
            <Box sx={{ border: `1px solid ${ACCENT_BORDER}`, borderRadius: '4px', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'rgba(245,158,11,0.03)' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                <SmallTextField
                  variant="standard"
                  label="Page title"
                  value={newPage.title}
                  onChange={(e) => setNewPage((p) => ({ ...p, title: e.target.value }))}
                />
                <SmallTextField
                  variant="standard"
                  label="Address (slug)"
                  value={newPage.slug}
                  onChange={(e) => setNewPage((p) => ({ ...p, slug: e.target.value }))}
                  helperText="Optional — defaults from title"
                />
              </Box>
              <SmallTextField
                variant="standard"
                label="Content (HTML)"
                multiline
                minRows={3}
                value={newPage.content}
                onChange={(e) => setNewPage((p) => ({ ...p, content: e.target.value }))}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleAddPage}
                  sx={{ bgcolor: PRIMARY, color: '#fff', textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, '&:hover': { bgcolor: '#0d2a44' } }}
                >
                  Add Page
                </Button>
                <Button
                  size="small"
                  onClick={() => setExpandedPage(null)}
                  sx={{ color: 'rgba(0,0,0,0.5)', textTransform: 'none', fontSize: '0.72rem' }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          {pages.length === 0 && expandedPage !== '__new' ? (
            <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.75rem', fontStyle: 'italic', py: 1 }}>
              No custom pages yet. Add an "About" or "Contact" page to extend your site.
            </Typography>
          ) : (
            pages.map((page) => {
              const isOpen = expandedPage === page.id;
              return (
                <Box key={page.id}>
                  <Box
                    onClick={() => setExpandedPage(isOpen ? null : page.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      py: 1.25,
                      px: 1,
                      border: `1px solid ${ACCENT_BORDER}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(245,158,11,0.04)' },
                    }}
                  >
                    <ExpandMore sx={{ fontSize: 18, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: ACCENT }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: PRIMARY, fontSize: '0.85rem', fontWeight: 600 }}>
                        {page.title}
                      </Typography>
                      <Typography sx={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.7rem' }}>
                        /{page.slug}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeletePage(page);
                      }}
                      sx={{ color: '#dc2626' }}
                    >
                      <DeleteOutlined sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Box>
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
                        <SmallTextField
                          variant="standard"
                          label="Page title"
                          value={page.title}
                          onChange={(e) => setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, title: e.target.value } : p)))}
                        />
                        <SmallTextField
                          variant="standard"
                          label="Address (slug)"
                          value={page.slug}
                          onChange={(e) => setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, slug: e.target.value } : p)))}
                        />
                      </Box>
                      <SmallTextField
                        variant="standard"
                        label="Content (HTML)"
                        multiline
                        minRows={4}
                        value={page.content}
                        onChange={(e) => setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, content: e.target.value } : p)))}
                        fullWidth
                      />
                      <Box>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => void handleSavePage(page)}
                          sx={{ bgcolor: PRIMARY, color: '#fff', textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, '&:hover': { bgcolor: '#0d2a44' } }}
                        >
                          Save Page
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              );
            })
          )}
        </Box>
      </Box>
        </Box>

        {/* Quick Settings */}
        <Box
          sx={{
            flex: { xs: 'none', md: '0 0 25%' },
            minHeight: 0,
            overflowY: 'auto',
            ...CUSTOM_SCROLLBAR,
          }}
        >
          <Box sx={{ ...CARD, bgcolor: '#fff' }}>
            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Typography sx={SECTION_LABEL}>Quick Settings</Typography>
            </Box>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <SmallTextField
                variant="standard"
                label="School name"
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                fullWidth
              />
              <SmallTextField
                variant="standard"
                label="Tagline"
                value={draft.tagline ?? ''}
                onChange={(e) => set('tagline', e.target.value)}
                fullWidth
              />
              <SmallTextField
                variant="standard"
                label="Website address (slug)"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <Language sx={{ fontSize: 15, mr: 0.5, color: 'rgba(0,0,0,0.35)' }} />,
                  },
                }}
                helperText="Served at /[address] — e.g. saint-theo-school"
              />
              <SmallTextField
                variant="standard"
                label="Phone"
                value={draft.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                fullWidth
              />
              <SmallTextField
                variant="standard"
                label="Email"
                value={draft.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                fullWidth
              />
              <SmallTextField
                variant="standard"
                label="Postal / street address"
                value={draft.address ?? ''}
                onChange={(e) => set('address', e.target.value)}
                fullWidth
                helperText="Optional — shown on Contact Us and used for directions"
              />
              <Box>
                <Typography sx={{ color: 'rgba(0,0,0,0.6)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1 }}>
                  Rwanda location
                </Typography>
                <LocationPicker
                  value={{
                    province: draft.province ?? '',
                    district: draft.district ?? '',
                    sector: draft.sector ?? '',
                    cell: draft.cell ?? '',
                    village: draft.village ?? '',
                  }}
                  onChange={(loc) => {
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            ...loc,
                            address:
                              prev.address?.trim() ||
                              buildAddressFromLocation(loc),
                          }
                        : prev
                    );
                  }}
                />
              </Box>
              {(draft.sector || draft.district || draft.province) && (
                <Box
                  sx={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.08)',
                    minHeight: 160,
                  }}
                >
                  <iframe
                    title="Location map preview"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={buildMapEmbedUrl(
                      {
                        province: draft.province ?? '',
                        district: draft.district ?? '',
                        sector: draft.sector ?? '',
                        cell: draft.cell ?? '',
                        village: draft.village ?? '',
                      },
                      draft.address ?? ''
                    )}
                    style={{ width: '100%', height: 160, border: 0, display: 'block' }}
                  />
                </Box>
              )}
              <Box>
                <Typography sx={{ color: 'rgba(0,0,0,0.6)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1 }}>
                  Primary color
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={draft.primaryColor}
                    onChange={(e) => set('primaryColor', e.target.value)}
                    style={{ width: 40, height: 30, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }}
                  />
                  <SmallTextField
                    variant="standard"
                    value={draft.primaryColor}
                    onChange={(e) => set('primaryColor', e.target.value)}
                    sx={{ width: 110 }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography sx={{ color: 'rgba(0,0,0,0.6)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', mb: 1 }}>
                  Accent color
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={draft.secondaryColor}
                    onChange={(e) => set('secondaryColor', e.target.value)}
                    style={{ width: 40, height: 30, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }}
                  />
                  <SmallTextField
                    variant="standard"
                    value={draft.secondaryColor}
                    onChange={(e) => set('secondaryColor', e.target.value)}
                    sx={{ width: 110 }}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SaveOutlined sx={{ fontSize: 15 }} />}
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  sx={{
                    flex: 1,
                    color: PRIMARY,
                    borderColor: dirty ? ACCENT : 'rgba(0,17,33,0.2)',
                    textTransform: 'none',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    '&:hover': { borderColor: ACCENT, bgcolor: 'rgba(245,158,11,0.06)' },
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={publishing ? <CircularProgress size={12} color="inherit" /> : <PublishOutlined sx={{ fontSize: 15 }} />}
                  onClick={handlePublish}
                  disabled={publishing}
                  sx={{
                    flex: 1,
                    bgcolor: PRIMARY,
                    color: '#fff',
                    textTransform: 'none',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#0d2a44' },
                  }}
                >
                  {publishing ? 'Publishing…' : 'Publish'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

interface ListEditorProps<T> {
  title: string;
  hint?: string;
  rows: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  render: (row: T, index: number) => React.ReactNode;
}

function ListEditor<T>({ title, hint, rows, onAdd, onRemove, render }: ListEditorProps<T>) {
  return (
    <Box sx={{mt:2,...CARD}}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography sx={SECTION_LABEL}>{title}</Typography>
          {hint && (
            <Typography sx={{ color: 'rgba(0,0,0,0.35)', fontSize: '0.65rem', mt: 0.25 }}>
              {hint}
            </Typography>
          )}
        </Box>
        <Button
          size="small"
          startIcon={<Add sx={{ fontSize: 15 }} />}
          onClick={onAdd}
          sx={{
            color: PRIMARY,
            textTransform: 'none',
            fontSize: '0.72rem',
            fontWeight: 600,
            border: `1px solid ${ACCENT_BORDER}`,
            borderRadius: '2px',
            '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' },
          }}
        >
          Add
        </Button>
      </Box>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.length === 0 && (
          <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.75rem', fontStyle: 'italic' }}>
            Nothing added yet.
          </Typography>
        )}
        {rows.map((row, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            {render(row, i)}
            <IconButton
              size="small"
              onClick={() => onRemove(i)}
              sx={{ color: '#dc2626', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '2px' }}
            >
              <DeleteOutlined sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
}