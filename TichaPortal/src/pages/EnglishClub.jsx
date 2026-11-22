import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../services/api';
import TeacherOrangeHero from '../components/TeacherOrangeHero';
import { brand } from '../theme/theme';

const FILTERS = [
  { id: 'all', label: 'All Resources' },
  { id: 'video', label: 'Videos' },
  { id: 'pdf', label: 'Pdfs' },
  { id: 'quiz', label: 'Quizs' },
];

export default function EnglishClub() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const url =
          filter === 'all'
            ? '/teacher-portal/english-club/resources'
            : `/teacher-portal/english-club/resources?type=${filter}`;
        const res = await api.get(url);
        if (res.data.success) {
          setResources(res.data.resources);
        }
      } catch {
        console.error('Could not load English Club resources.');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [filter]);

  const filteredResources = resources.filter(
    (res) =>
      res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (res.description && res.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Box sx={{ position: 'relative', width: '100%', bgcolor: brand.background, minHeight: '100vh' }}>
      <TeacherOrangeHero title="English Club" subtitle="Sharpening pedagogy through linguistic mastery." />

      <Box
        sx={{
          maxWidth: 1600,
          mx: 'auto',
          px: { xs: 0, md: 6 },
          mt: { xs: 0, md: -5 },
          position: 'relative',
          zIndex: 20,
          pb: 10,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
            gap: { xs: 3, md: 4 },
            bgcolor: { xs: '#fff', md: 'transparent' },
            minHeight: { xs: '100vh', md: 0 },
          }}
        >
          <Box sx={{ gridColumn: { lg: 'span 2' }, display: 'flex', flexDirection: 'column', gap: { xs: 0, md: 3 } }}>
            <Box sx={{ display: { xs: 'block', md: 'none' }, px: 3, py: 3, borderBottom: `1px solid ${brand.border}` }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: brand.navy }} />
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.text, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                  CPD Resources
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 24, fontWeight: 700, color: brand.text, letterSpacing: '-0.02em' }}>
                English <Box component="span" sx={{ color: brand.navy, fontWeight: 700, fontStyle: 'italic' }}>Club</Box>
              </Typography>
            </Box>

            <Paper
              variant="outlined"
              sx={{ bgcolor: '#fff', borderRadius: { xs: 0, md: '20px' }, borderColor: brand.border, overflow: 'hidden' }}
            >
              <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${brand.border}`, bgcolor: 'rgba(247,248,250,0.2)' }}>
                <ButtonBase
                  onClick={() => setShowMobileFilters((v) => !v)}
                  sx={{ display: { lg: 'none' }, width: '100%', justifyContent: 'space-between', mb: showMobileFilters ? 1.5 : 0 }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ color: brand.text }}>
                    <FilterListIcon sx={{ fontSize: 16, color: brand.navy }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Resource filters</Typography>
                  </Stack>
                  {showMobileFilters ? (
                    <ExpandLessIcon sx={{ fontSize: 16, color: brand.navy }} />
                  ) : (
                    <ExpandMoreIcon sx={{ fontSize: 16, color: brand.muted }} />
                  )}
                </ButtonBase>

                <Stack
                  direction={{ xs: 'column', lg: 'row' }}
                  spacing={1.5}
                  alignItems={{ lg: 'center' }}
                  sx={{ display: { xs: showMobileFilters ? 'flex' : 'none', lg: 'flex' } }}
                >
                  <TextField
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search resources..."
                    sx={{ width: { xs: '100%', lg: 'auto' }, flex: { lg: 1 }, minWidth: { lg: 160 }, maxWidth: { lg: 240 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 16, color: brand.muted }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ flexShrink: 0 }}>
                    {FILTERS.map((f) => (
                      <Button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        sx={{
                          height: 40,
                          px: 2,
                          borderRadius: 1.5,
                          fontSize: 10,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          border: '1px solid',
                          borderColor: filter === f.id ? brand.navy : brand.border,
                          bgcolor: filter === f.id ? brand.navy : '#fff',
                          color: filter === f.id ? '#fff' : brand.muted,
                          '&:hover': { bgcolor: filter === f.id ? brand.navy2 : brand.background, color: filter === f.id ? '#fff' : brand.text },
                        }}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Box>
            </Paper>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: { xs: 0, md: 3 },
                borderBottom: { xs: `1px solid ${brand.border}`, md: 'none' },
              }}
            >
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: { xs: 0, md: '24px' }, borderColor: brand.border }}>
                    <Skeleton variant="rounded" height={128} />
                    <Skeleton width="66%" sx={{ mt: 2 }} />
                    <Skeleton width="50%" />
                  </Paper>
                ))
              ) : filteredResources.length > 0 ? (
                filteredResources.map((res) => (
                  <Paper
                    key={res.id}
                    variant="outlined"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      borderRadius: { xs: 0, md: '24px' },
                      borderColor: brand.border,
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: '0 18px 45px -20px rgba(14,31,53,0.5)' },
                    }}
                  >
                    <Box sx={{ height: { xs: 176, md: 144 }, position: 'relative', bgcolor: brand.background, overflow: 'hidden' }}>
                      {res.thumbnail_url ? (
                        <Box
                          component="img"
                          src={res.thumbnail_url}
                          alt={res.title}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1)', opacity: 0.8, transition: 'all 0.7s', '&:hover': { filter: 'grayscale(0)', opacity: 1, transform: 'scale(1.05)' } }}
                        />
                      ) : (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: 0.1 }}>
                          <MenuBookOutlinedIcon sx={{ fontSize: 64, color: brand.text }} />
                        </Box>
                      )}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          backdropFilter: 'blur(6px)',
                          fontSize: 8,
                          fontWeight: 700,
                          color: brand.muted,
                        }}
                      >
                        {res.content_type.toUpperCase()}
                      </Box>
                      {res.content_type === 'video' ? (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0,0,0,0.1)' }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#fff', display: 'grid', placeItems: 'center', color: brand.navy, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
                            <PlayArrowRoundedIcon />
                          </Box>
                        </Box>
                      ) : null}
                    </Box>

                    <Box sx={{ p: { xs: 3, md: 2.5 }, display: 'flex', flexDirection: 'column', flex: 1, bgcolor: '#fff' }}>
                      <Box sx={{ flex: 1, mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 4, height: 12, borderRadius: '50px', bgcolor: brand.navy }} />
                          <Typography sx={{ fontSize: 9, fontWeight: 700, color: brand.navy, opacity: 0.6 }}>
                            Verified Content
                          </Typography>
                        </Stack>
                        <Typography
                          noWrap
                          sx={{ mt: 0.75, fontSize: 14, fontWeight: 700, color: brand.text, letterSpacing: '-0.01em', lineHeight: 1.25 }}
                        >
                          {res.title}
                        </Typography>
                        <Typography
                          sx={{
                            mt: 0.5,
                            fontSize: 11,
                            color: brand.muted,
                            fontWeight: 500,
                            lineHeight: 1.5,
                            opacity: 0.6,
                            fontStyle: 'italic',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {res.description}
                        </Typography>
                      </Box>

                      <Button
                        component="a"
                        href={res.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        fullWidth
                        endIcon={<ChevronRightIcon />}
                        sx={{
                          py: { xs: 1.75, md: 1.5 },
                          borderRadius: 1.5,
                          bgcolor: brand.background,
                          color: brand.text,
                          fontWeight: 700,
                          fontSize: { xs: 11, md: 10 },
                          '&:hover': { bgcolor: brand.primary, color: '#fff' },
                        }}
                      >
                        Examine Resource
                      </Button>
                    </Box>
                  </Paper>
                ))
              ) : (
                <Stack
                  alignItems="center"
                  spacing={2.5}
                  sx={{ gridColumn: '1 / -1', py: 10, px: 2, bgcolor: { md: '#fff' }, borderRadius: { md: '24px' }, border: { md: `1px solid ${brand.border}` } }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(19,33,61,0.1)', borderRadius: '50%', filter: 'blur(40px)', transform: 'scale(1.5)' }} />
                    <Box component="img" src="/no_student_found.png" alt="No resources" sx={{ width: { xs: 192, md: 256 }, height: { xs: 192, md: 256 }, objectFit: 'contain', position: 'relative', zIndex: 1 }} />
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, color: brand.text }}>Zero trace of activity</Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 11, color: brand.muted, fontWeight: 500, opacity: 0.4, maxWidth: 320, mx: 'auto', lineHeight: 1.5 }}>
                      No matching educational assets found. Adjust your filters or try another search.
                    </Typography>
                  </Box>
                  <Button
                    onClick={() => {
                      setFilter('all');
                      setSearchTerm('');
                    }}
                    sx={{ color: brand.navy, fontWeight: 700, fontSize: 11, bgcolor: brand.background, px: 3 }}
                  >
                    Clear Filters
                  </Button>
                </Stack>
              )}
            </Box>
          </Box>

          <Stack spacing={3} sx={{ display: { xs: 'none', lg: 'flex' }, position: 'sticky', top: 32, height: 'fit-content' }}>
            <Paper variant="outlined" sx={{ borderRadius: '24px', p: 2.5, pt: 2, borderColor: brand.border }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Box sx={{ width: 2, height: 12, borderRadius: '50px', bgcolor: brand.navy }} />
                <Typography sx={{ fontSize: 9, fontWeight: 700, color: brand.text, textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.4 }}>
                  Mastery Stats
                </Typography>
              </Stack>

              <Stack spacing={2}>
                <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'rgba(247,248,250,0.5)', border: `1px solid ${brand.border}` }}>
                  <Typography sx={{ fontSize: 8, fontWeight: 700, color: brand.muted, textTransform: 'uppercase', letterSpacing: '0.2em', mb: 0.5 }}>
                    Weekly Goals
                  </Typography>
                  <Stack direction="row" alignItems="flex-end" justifyContent="space-between">
                    <Typography sx={{ fontSize: 20, fontWeight: 700, color: brand.text, letterSpacing: '-0.03em' }}>12 / 20</Typography>
                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>On Track</Typography>
                  </Stack>
                  <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '50px', mt: 1, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '60%', bgcolor: brand.primary }} />
                  </Box>
                </Box>

                <Button
                  fullWidth
                  sx={{
                    py: 1.5,
                    borderRadius: 1.5,
                    border: `1px dashed rgba(19,33,61,0.2)`,
                    fontSize: 9,
                    fontWeight: 700,
                    color: brand.navy,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    '&:hover': { bgcolor: 'rgba(19,33,61,0.05)' },
                  }}
                >
                  View Pedagogy Roadmap
                </Button>
              </Stack>
            </Paper>

            <Box
              sx={{
                position: 'relative',
                borderRadius: '24px',
                p: 2.5,
                color: '#fff',
                overflow: 'hidden',
                background: 'linear-gradient(145deg,#0E1F35,#1F3554)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 18px 45px -20px rgba(14,31,53,0.8)',
              }}
            >
              <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(19,33,61,0.24), transparent 34%)' }} />
              <Stack spacing={1.5} sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ width: 32, height: 32, bgcolor: 'rgba(19,33,61,0.15)', borderRadius: 1.5, display: 'grid', placeItems: 'center', border: '1px solid rgba(19,33,61,0.2)' }}>
                  <AutoAwesomeIcon sx={{ fontSize: 16, color: brand.primary }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.9 }}>
                    Expert Webinar
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: 700, lineHeight: 1.4, textTransform: 'uppercase' }}>
                    Deep dive into advanced English pedagogy tomorrow at 2PM.
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Typography sx={{ textAlign: 'center', fontSize: 7, color: brand.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.3, fontStyle: 'italic' }}>
              Continuous Professional Development System
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
