import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import LessonPlanningLayout from '../../components/lessonPlanning/LessonPlanningLayout';
import LessonPlanFilterBar from '../../components/lessonPlanning/LessonPlanFilterBar';
import {
  downloadLessonPlanExport,
  fetchLessonPlanningContext,
  listLessonPlansPaginated,
} from '../../services/lessonPlanningApi';
import { brand } from '../../theme/theme';

const labelSx = { fontSize: 12.5, fontWeight: 700, color: brand.muted, mb: 0.5 };

const selectSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#F2F4F8',
    borderRadius: 2,
    fontSize: 15,
    transition: 'border-color 120ms ease, background-color 120ms ease',
    '& fieldset': { borderColor: 'transparent' },
    '&:hover': { bgcolor: '#EDF0F6' },
    '&:hover fieldset': { borderColor: 'transparent' },
    '&.Mui-focused': { bgcolor: '#fff' },
    '&.Mui-focused fieldset': { borderColor: brand.primary, borderWidth: 2 },
  },
  '& .MuiSelect-select': { py: 1.15 },
};

export default function LessonPlanBookPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [format, setFormat] = useState('pdf');
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({ academicYear: '', term: '', subject: '' });
  const [ctxOptions, setCtxOptions] = useState({ years: [], terms: [] });

  useEffect(() => {
    (async () => {
      const ctx = await fetchLessonPlanningContext();
      setCtxOptions({
        years: ctx.academicYears?.length ? ctx.academicYears : [ctx.academicYear].filter(Boolean),
        terms: ctx.terms?.length ? ctx.terms : ['Term 1', 'Term 2', 'Term 3'],
      });
      setFilters((f) => ({ ...f, academicYear: ctx.academicYear, term: ctx.term }));
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listLessonPlansPaginated({
          page: '1',
          pageSize: '50',
          academicYear: filters.academicYear || undefined,
          term: filters.term || undefined,
          subject: filters.subject || undefined,
        });
        if (!cancelled) {
          setPlans(res.items || []);
          setSelected(new Set((res.items || []).map((p) => p.id)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const downloadSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(true);
    try {
      for (const id of ids) {
        await downloadLessonPlanExport(id, format);
      }
    } finally {
      setBusy(false);
    }
  };

  const downloadLabel = busy ? 'Downloading...' : `Download ${selected.size} plan(s)`;

  return (
    <LessonPlanningLayout
      title="Download lesson plan book"
      subtitle="Export selected plans as PDF or DOCX."
      filterBar={
        <LessonPlanFilterBar
          filters={[
            {
              key: 'year',
              label: 'Academic year',
              value: filters.academicYear,
              onChange: (v) => setFilters((f) => ({ ...f, academicYear: v })),
              options: [{ value: '', label: 'All years' }, ...ctxOptions.years.map((y) => ({ value: y, label: y }))],
            },
            {
              key: 'term',
              label: 'Term',
              flex: 0.85,
              value: filters.term,
              onChange: (v) => setFilters((f) => ({ ...f, term: v })),
              options: [{ value: '', label: 'All terms' }, ...ctxOptions.terms.map((t) => ({ value: t, label: t }))],
            },
            {
              key: 'format',
              label: 'Format',
              flex: 0.7,
              value: format,
              onChange: (v) => setFormat(v),
              options: [
                { value: 'pdf', label: 'PDF' },
                { value: 'docx', label: 'DOCX' },
              ],
            },
          ]}
        />
      }
    >
      <Box sx={{ pb: { xs: 12, lg: 0 } }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' } }}>
          <Paper variant="outlined" sx={{ order: { xs: 2, lg: 1 }, borderRadius: 2, borderColor: '#E2E8F0', p: 2.5 }}>
            <Stack spacing={1.5}>
              <Button
                type="button"
                variant="contained"
                color="secondary"
                disabled={busy || !selected.size}
                onClick={() => void downloadSelected()}
                sx={{ display: { xs: 'none', lg: 'inline-flex' }, minHeight: 40, borderRadius: 1, bgcolor: brand.navy, color: '#fff !important', fontSize: 14, fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: brand.navy2 }, '&.Mui-disabled': { opacity: 0.5, bgcolor: brand.navy } }}
              >
                {downloadLabel}
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ order: { xs: 1, lg: 2 }, borderRadius: 2, borderColor: '#E2E8F0', p: 2.5 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} sx={{ color: brand.navy }} />
              </Box>
            ) : (
              <Stack component="ul" spacing={0} sx={{ maxHeight: 420, overflow: 'auto', m: 0, p: 0, listStyle: 'none', fontSize: 14 }}>
                {plans.map((p) => (
                  <Stack
                    component="li"
                    key={p.id}
                    direction="row"
                    alignItems="flex-start"
                    spacing={1.5}
                    sx={{ py: 1.5, borderBottom: '1px solid #F1F5F9', '&:last-of-type': { borderBottom: 'none' } }}
                  >
                    <Checkbox
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      size="small"
                      sx={{ mt: 0.25, p: 0.5 }}
                    />
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{p.lesson?.title}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                        {p.subjectLabel} · {p.className} · Unit {p.lesson?.unit?.unitNumber}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          borderTop: '1px solid #E2E8F0',
          bgcolor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          p: 2,
          pb: 'max(1rem, env(safe-area-inset-bottom))',
          display: { lg: 'none' },
        }}
      >
        <Button
          type="button"
          variant="contained"
          color="secondary"
          fullWidth
          disabled={busy || !selected.size}
          onClick={() => void downloadSelected()}
          sx={{ minHeight: 44, borderRadius: 1, bgcolor: brand.navy, color: '#fff !important', fontSize: 14, fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: brand.navy2 }, '&.Mui-disabled': { opacity: 0.5, bgcolor: brand.navy } }}
        >
          {downloadLabel}
        </Button>
      </Box>
    </LessonPlanningLayout>
  );
}
