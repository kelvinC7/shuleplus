import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Alert,
  Button,
  Chip,
  Paper,
  Skeleton,
  Checkbox,
  Collapse,
  Drawer,
  IconButton,
} from '@mui/material';
import {
  Search,
  LocationOn,
  ArrowForward,
  School,
  Dashboard,
  Email,
  Phone,
  Public,
  Tune,
  GridOn,
  ViewList,
  Close,
  ExpandMore,
  MenuBook,
} from '@mui/icons-material';
import { listPublishedSchools, resolveAssetUrl } from '@/services/public';
import type { PublicSchoolSite } from '@/services/public';

const NAVY = '#001121';
const AMBER = '#f59e0b';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/* ── Collapsible filter section (mirrors the legacy AllSchools sidebar) ── */
function FilterSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box sx={{ borderBottom: '1px solid #f1f5f9', '&:last-of-type': { borderBottom: 0 } }}>
      <Button
        onClick={() => setOpen((o) => !o)}
        fullWidth
        sx={{
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          color: NAVY,
          fontWeight: 800,
          fontSize: 13,
          textTransform: 'none',
          '&:hover': { bgcolor: 'rgba(245,158,11,0.06)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: AMBER, display: 'flex' }}>{icon}</Box>
          {title}
        </Box>
        <ExpandMore
          sx={{ fontSize: 16, color: open ? AMBER : '#cbd5e1', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </Button>
      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

function CheckItem({
  label,
  checked,
  onToggle,
  count,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  count: number;
}) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        py: 0.75,
        borderRadius: 1.5,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' },
      }}
    >
      <Checkbox
        checked={checked}
        onClick={(e) => e.stopPropagation()}
        onChange={onToggle}
        disableRipple
        size="small"
        sx={{
          p: 0.25,
          color: checked ? AMBER : '#cbd5e1',
          '&.Mui-checked': { color: AMBER },
        }}
      />
      <Typography sx={{ flex: 1, fontSize: 13, fontWeight: checked ? 800 : 500, color: checked ? NAVY : '#64748b' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 800, px: 1, py: 0.25, borderRadius: 2, bgcolor: checked ? 'rgba(245,158,11,0.15)' : '#f1f5f9', color: checked ? '#92400e' : '#94a3b8' }}>
        {count}
      </Typography>
    </Box>
  );
}

/* ── School card (grid) ── */
function SiteCard({ school, index }: { school: PublicSchoolSite; index: number }) {
  const cover = resolveAssetUrl(school.heroImageUrl);
  const logo = resolveAssetUrl(school.logoUrl);
  const programs = school.programs ?? [];

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        animationDelay: `${(index % 12) * 40}ms`,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 40px rgba(0,17,33,0.12)',
          borderColor: AMBER,
        },
      }}
    >
      <Box sx={{ position: 'relative', height: 100, backgroundColor: NAVY, flexShrink: 0 }}>
        {cover ? (
          <Box component="img" src={cover} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at 80% 20%, ${school.secondaryColor}33, transparent 60%), linear-gradient(135deg, #111827, ${NAVY})`,
            }}
          />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'rgba(0,17,33,0.35)' }} />
        <Box
          sx={{
            position: 'absolute',
            bottom: -16,
            left: 14,
            width: 40,
            height: 40,
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
            border: '2px solid #fff',
            backgroundColor: NAVY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          {logo ? (
            <Box component="img" src={logo} alt={`${school.title} logo`} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <Typography sx={{ color: AMBER, fontWeight: 900, fontSize: 14 }}>
              {initials(school.title || school.organizationName || 'S')}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ p: 1.75, pt: 2.25, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 14, lineHeight: 1.3, mb: 0.5, minHeight: 36 }}>
          {school.title}
        </Typography>
        {school.tagline && (
          <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, display: 'block' }}>
            {school.tagline}
          </Typography>
        )}
        {school.district && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', mb: 1.5 }}>
            <LocationOn sx={{ fontSize: 15, color: AMBER }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {school.district}
            </Typography>
          </Box>
        )}
        {programs.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {programs.slice(0, 3).map((p) => (
              <Chip
                key={p.name}
                label={p.name}
                size="small"
                sx={{ fontSize: 9.5, fontWeight: 700, backgroundColor: '#fff7e6', color: '#92400e' }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            {school.phone ? (
              <>
                <Phone sx={{ fontSize: 13, color: 'text.disabled' }} />
                <Typography variant="caption" sx={{ color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {school.phone}
                </Typography>
              </>
            ) : school.email ? (
              <>
                <Email sx={{ fontSize: 13, color: 'text.disabled' }} />
                <Typography variant="caption" sx={{ color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {school.email}
                </Typography>
              </>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Published
              </Typography>
            )}
          </Box>
          <Button
            component="a"
            href={school.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<ArrowForward sx={{ fontSize: 15 }} />}
            sx={{
              color: AMBER,
              fontWeight: 800,
              fontSize: 12,
              textTransform: 'none',
              '&:hover': { color: '#b45309' },
            }}
          >
            Visit Website
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

/* ── School row (list) ── */
function SiteRow({ school }: { school: PublicSchoolSite }) {
  const logo = resolveAssetUrl(school.logoUrl);
  const programs = school.programs ?? [];
  return (
    <Paper
      component="a"
      href={school.publicUrl}
      target="_blank"
      rel="noopener noreferrer"
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid #e2e8f0',
        textDecoration: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { borderColor: AMBER, boxShadow: '0 8px 24px rgba(0,17,33,0.08)' },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          border: '2px solid #f1f5f9',
          backgroundColor: NAVY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {logo ? (
          <Box component="img" src={logo} alt={`${school.title} logo`} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <Typography sx={{ color: AMBER, fontWeight: 900, fontSize: 16 }}>{initials(school.title || 'S')}</Typography>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 14 }} noWrap>
          {school.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.25 }}>
          {school.district && (
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: 'text.secondary', fontWeight: 600 }}>
              <LocationOn sx={{ fontSize: 12, color: AMBER }} />
              {school.district}
            </Typography>
          )}
          {programs.slice(0, 3).map((p) => (
            <Chip key={p.name} label={p.name} size="small" sx={{ fontSize: 10, fontWeight: 700, backgroundColor: '#fff7e6', color: '#92400e' }} />
          ))}
        </Box>
      </Box>
      <ArrowForward sx={{ fontSize: 16, color: '#cbd5e1', flexShrink: 0 }} />
    </Paper>
  );
}

function CardSkeleton() {
  return (
    <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={100} sx={{ backgroundColor: '#eef2f7' }} />
      <Box sx={{ p: 1.75, pt: 2.25 }}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="45%" height={12} sx={{ mt: 1 }} />
        <Skeleton width="55%" height={12} sx={{ mt: 1 }} />
        <Skeleton width="100%" height={30} sx={{ mt: 1.75 }} />
      </Box>
    </Paper>
  );
}

export default function SchoolDirectory() {
  const [schools, setSchools] = useState<PublicSchoolSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [selPrograms, setSelPrograms] = useState<string[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [mobileFilter, setMobileFilter] = useState(false);

  useEffect(() => {
    listPublishedSchools()
      .then(setSchools)
      .catch((err: unknown) => setError((err as Error).message ?? 'Failed to load schools'))
      .finally(() => setLoading(false));
  }, []);

  const districts = useMemo(
    () => [...new Set(schools.map((s) => s.district).filter((d): d is string => Boolean(d)))].sort(),
    [schools]
  );

  const programOptions = useMemo(
    () =>
      [...new Set((schools.flatMap((s) => s.programs ?? []).map((p) => p.name)))].sort(),
    [schools]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schools.filter((s) => {
      if (district && s.district !== district) return false;
      if (selPrograms.length > 0 && !selPrograms.some((name) => (s.programs ?? []).some((p) => p.name === name))) return false;
      if (!q) return true;
      const hay = [s.title, s.organizationName, s.tagline, s.district, s.address, ...(s.programs ?? []).map((p) => p.name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [schools, search, district, selPrograms]);

  const activeFilters = selPrograms.length + (district ? 1 : 0);

  const toggleProgram = (name: string) =>
    setSelPrograms((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));

  const clearAll = () => {
    setSearch('');
    setDistrict('');
    setSelPrograms([]);
  };

  const activeChips = [
    ...(district ? [{ label: district, clear: () => setDistrict('') }] : []),
    ...selPrograms.map((name) => ({ label: name, clear: () => toggleProgram(name) })),
  ];

  /* Sidebar content shared by desktop aside + mobile drawer. */
  const SidebarContent = () => (
    <Box>
      <FilterSection title="District" icon={<LocationOn sx={{ fontSize: 15 }} />}>
        <FormControl fullWidth size="small">
          <Select
            value={district}
            onChange={(e) => setDistrict(e.target.value as string)}
            displayEmpty
            sx={{
              borderRadius: 1.5,
              fontSize: 13,
              fontWeight: 600,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
            }}
          >
            <MenuItem value="">
              <em>All districts</em>
            </MenuItem>
            {districts.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterSection>
      <FilterSection title="Programs" icon={<MenuBook sx={{ fontSize: 15 }} />} defaultOpen={programOptions.length > 0}>
        {programOptions.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: '#94a3b8', px: 1, py: 1 }}>No programs yet</Typography>
        ) : (
          <Box>
            {programOptions.map((name) => (
              <CheckItem
                key={name}
                label={name}
                checked={selPrograms.includes(name)}
                onToggle={() => toggleProgram(name)}
                count={schools.filter((s) => (s.programs ?? []).some((p) => p.name === name)).length}
              />
            ))}
          </Box>
        )}
      </FilterSection>
    </Box>
  );

  const viewToggle = (light: boolean) => (
    <Box
      sx={{
        display: 'inline-flex',
        p: 0.5,
        borderRadius: 1.5,
        bgcolor: light ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
        border: light ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.15)',
        flexShrink: 0,
      }}
    >
      <IconButton
        size="small"
        onClick={() => setView('grid')}
        sx={{
          borderRadius: 1,
          bgcolor: view === 'grid' ? (light ? NAVY : AMBER) : 'transparent',
          color: view === 'grid' ? (light ? AMBER : NAVY) : light ? '#94a3b8' : 'rgba(255,255,255,0.4)',
          '&:hover': { bgcolor: view === 'grid' ? (light ? NAVY : AMBER) : 'rgba(245,158,11,0.15)' },
        }}
      >
        <GridOn sx={{ fontSize: 16 }} />
      </IconButton>
      <IconButton
        size="small"
        onClick={() => setView('list')}
        sx={{
          borderRadius: 1,
          bgcolor: view === 'list' ? (light ? NAVY : AMBER) : 'transparent',
          color: view === 'list' ? (light ? AMBER : NAVY) : light ? '#94a3b8' : 'rgba(255,255,255,0.4)',
          '&:hover': { bgcolor: view === 'list' ? (light ? NAVY : AMBER) : 'rgba(245,158,11,0.15)' },
        }}
      >
        <ViewList sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
      {/* ── Header ── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ bgcolor: NAVY, borderBottom: '3px solid', borderColor: AMBER, zIndex: 30 }}
      >
        <Toolbar sx={{ gap: 2, px: { xs: 2, md: 3 }, py: 1, minHeight: 'auto', flexWrap: { xs: 'wrap' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <School sx={{ color: NAVY, fontSize: 20 }} />
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 14, lineHeight: 1.1 }}>
                School Mini-Websites
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600 }}>
                Find any school's official website
              </Typography>
            </Box>
          </Box>

          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schools, districts, programs…"
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              flex: 1,
              minWidth: 180,
              bgcolor: 'rgba(255,255,255,0.08)',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                height: 36,
                borderRadius: 2,
                '& fieldset': { border: '1px solid rgba(245,158,11,0.25)' },
                '&:hover fieldset': { borderColor: 'rgba(245,158,11,0.5)' },
                '&.Mui-focused fieldset': { borderColor: AMBER },
              },
              '& .MuiInputBase-input': { color: '#fff', fontSize: 13, py: 0, '&::placeholder': { color: 'rgba(255,255,255,0.4)' } },
            }}
          />

          {/* Mobile filter button */}
          <Button
            onClick={() => setMobileFilter(true)}
            startIcon={<Tune sx={{ fontSize: 15 }} />}
            sx={{
              display: { md: 'none' },
              color: '#fff',
              border: '1px solid rgba(245,158,11,0.3)',
              bgcolor: 'rgba(255,255,255,0.08)',
              textTransform: 'none',
              fontWeight: 800,
              fontSize: 12,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
            }}
          >
            Filters
            {activeFilters > 0 && (
              <Box sx={{ width: 18, height: 18, ml: 0.5, borderRadius: '50%', bgcolor: AMBER, color: NAVY, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeFilters}
              </Box>
            )}
          </Button>

          {/* View toggle (desktop) */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>{viewToggle(false)}</Box>

          <Button
            component={Link}
            to="/home"
            startIcon={<Dashboard sx={{ fontSize: 15 }} />}
            sx={{
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              bgcolor: 'rgba(255,255,255,0.1)',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
          >
            Dashboard
          </Button>
        </Toolbar>
      </AppBar>

      {/* ── Hero strip ── */}
      <Box sx={{ bgcolor: NAVY, py: { xs: 4, md: 5 }, borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: '#fff',
                  fontSize: { xs: 26, sm: 32, md: 40 },
                  letterSpacing: '-0.02em',
                  lineHeight: 1.12,
                }}
              >
                Explore{' '}
                <Box
                  component="span"
                  sx={{
                    fontFamily: "'Caveat', cursive",
                    fontWeight: 700,
                    fontSize: { xs: '1.5em', sm: '1.45em', md: '1.4em' },
                    letterSpacing: '0.01em',
                    lineHeight: 1.1,
                    background: 'linear-gradient(100deg, #f59e0b 10%, #ffd88a 45%, #fcb038 90%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  School Websites
                </Box>
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.55)', mt: 1, fontSize: { xs: 13, sm: 14 } }}>
                {loading ? 'Loading…' : `${filtered.length} of ${schools.length} schools across Rwanda`}
              </Typography>
            </Box>
            {activeFilters > 0 && (
              <Button
                onClick={clearAll}
                startIcon={<Close sx={{ fontSize: 14 }} />}
                sx={{
                  color: AMBER,
                  border: '1px solid rgba(245,158,11,0.4)',
                  bgcolor: 'rgba(245,158,11,0.1)',
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: 12,
                  '&:hover': { bgcolor: 'rgba(245,158,11,0.2)' },
                }}
              >
                Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      {/* ── Active filter chips ── */}
      {activeChips.length > 0 && (
        <Box sx={{ bgcolor: NAVY, borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
          <Container maxWidth="lg" sx={{ py: 1, display: 'flex', gap: 1 }}>
            {activeChips.map((chip, i) => (
              <Button
                key={i}
                onClick={chip.clear}
                endIcon={<Close sx={{ fontSize: 12 }} />}
                sx={{ color: NAVY, bgcolor: AMBER, textTransform: 'none', fontWeight: 800, fontSize: 11, px: 1.5, py: 0.5, flexShrink: 0, '&:hover': { bgcolor: '#eab308' } }}
              >
                {chip.label}
              </Button>
            ))}
          </Container>
        </Box>
      )}

      {/* ── Main body ── */}
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 }, flex: 1, display: 'flex', gap: 3.5 }}>
        {/* Desktop sidebar */}
        <Box component="aside" sx={{ display: { xs: 'none', md: 'block' }, width: { md: 240, lg: 260 }, flexShrink: 0 }}>
          <Paper
            elevation={0}
            sx={{
              position: 'sticky',
              top: 24,
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tune sx={{ fontSize: 14, color: NAVY }} />
                </Box>
                <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 13 }}>Filters</Typography>
                {activeFilters > 0 && (
                  <Typography sx={{ fontSize: 10, fontWeight: 800, px: 1, py: 0.25, borderRadius: 2, bgcolor: AMBER, color: NAVY }}>
                    {activeFilters}
                  </Typography>
                )}
              </Box>
              {activeFilters > 0 && (
                <Button onClick={clearAll} sx={{ color: '#b45309', fontSize: 11, fontWeight: 800, textTransform: 'none', minWidth: 0, p: 0 }}>
                  Clear all
                </Button>
              )}
            </Box>
            <SidebarContent />
          </Paper>
        </Box>

        {/* Results */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 13 }}>
              {loading
                ? 'Loading schools…'
                : `${filtered.length} result${filtered.length === 1 ? '' : 's'}${search ? ` for "${search.trim()}"` : ''}`}
            </Typography>
            {/* View toggle (mobile only) */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>{viewToggle(true)}</Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2, mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2.5 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </Box>
          ) : filtered.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                textAlign: 'center',
                p: { xs: 6, md: 10 },
                borderRadius: 3,
                border: '2px dashed #fcd34d',
                bgcolor: '#fffef9',
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: 'rgba(245,158,11,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Public sx={{ color: AMBER, fontSize: 30 }} />
              </Box>
              <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 17 }}>
                No schools match your filters
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 3, maxWidth: 360, mx: 'auto' }}>
                Try a different search or clear the filters to see all published school websites.
              </Typography>
              <Button
                variant="contained"
                onClick={clearAll}
                sx={{ bgcolor: AMBER, color: NAVY, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#eab308' } }}
              >
                Clear all filters
              </Button>
            </Paper>
          ) : view === 'list' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {filtered.map((school) => (
                <SiteRow key={school.id} school={school} />
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2.5 }}>
              {filtered.map((school, i) => (
                <SiteCard key={school.id} school={school} index={i} />
              ))}
            </Box>
          )}
        </Box>
      </Container>

      {/* ── Mobile filter drawer ── */}
      <Drawer anchor="left" open={mobileFilter} onClose={() => setMobileFilter(false)}>
        <Box sx={{ width: 300, maxWidth: '88vw', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: NAVY, borderBottom: '3px solid', borderColor: AMBER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: AMBER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tune sx={{ fontSize: 14, color: NAVY }} />
              </Box>
              <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: 13 }}>Filters</Typography>
              {activeFilters > 0 && (
                <Typography sx={{ fontSize: 10, fontWeight: 800, px: 1, py: 0.25, borderRadius: 2, bgcolor: AMBER, color: NAVY }}>
                  {activeFilters}
                </Typography>
              )}
            </Box>
            <IconButton size="small" onClick={() => setMobileFilter(false)} sx={{ color: 'rgba(255,255,255,0.7)', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <SidebarContent />
          </Box>
          <Box sx={{ p: 2, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 1.5, flexShrink: 0 }}>
            <Button onClick={clearAll} sx={{ flex: 1, border: '2px solid #e2e8f0', color: '#64748b', textTransform: 'none', fontWeight: 700, fontSize: 13, borderRadius: 1.5 }}>
              Clear all
            </Button>
            <Button
              onClick={() => setMobileFilter(false)}
              sx={{ flex: 1, bgcolor: AMBER, color: NAVY, textTransform: 'none', fontWeight: 800, fontSize: 13, borderRadius: 1.5, '&:hover': { bgcolor: '#eab308' } }}
            >
              Show {filtered.length} results
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* ── Footer ── */}
      <Box sx={{ bgcolor: NAVY, mt: 'auto' }}>
        <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
            Powered by <span style={{ color: AMBER, fontWeight: 800 }}>ShulePlus</span> School Mini-Websites
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
