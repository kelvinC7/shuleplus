import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageLoading, EmptyState, ErrorBanner } from '../components/ui';
import {
  ListPage,
  StickyFilterBar,
  BarSelect,
  ListPageBody,
  PageTitleRow,
  NavyStats,
  SectionPaper,
} from '../components/ListPageKit';
import useAutoRefresh from '../hooks/useAutoRefresh';
import useTpAcademic from '../hooks/useTpAcademic';
import { fetchMyCourses, tpApiError } from '../services/teacherPortalApi';
import { brand } from '../theme/theme';

export default function MyCourses() {
  const { ready } = useTpAcademic();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMyCourses());
    } catch (err) {
      setError(tpApiError(err, 'Could not load your courses'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  useAutoRefresh(load, { enabled: ready });

  const subjectOptions = useMemo(
    () => (data?.grouped ?? []).map((g) => g.subjectName).filter(Boolean),
    [data?.grouped]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = data?.grouped ?? [];
    if (subject) list = list.filter((g) => g.subjectName === subject);
    if (!q) return list;
    return list.filter(
      (group) =>
        group.subjectName.toLowerCase().includes(q) ||
        group.classes.some((c) => c.className.toLowerCase().includes(q))
    );
  }, [data?.grouped, search, subject]);

  const initialLoading = loading && !data;
  const classCount = (data?.grouped ?? []).reduce((n, g) => n + g.classes.length, 0);
  const stats = [
    { label: 'Subjects', value: initialLoading ? '—' : (data?.grouped?.length ?? 0) },
    { label: 'Classes', value: initialLoading ? '—' : classCount },
    { label: 'Assignments', value: initialLoading ? '—' : (data?.assignments?.length ?? 0) },
    { label: 'Periods / Week', value: initialLoading ? '—' : (data?.totalPeriods ?? 0) },
  ];

  return (
    <ListPage>
      <StickyFilterBar search={search} onSearch={setSearch} searchPlaceholder="Search courses…">
        <BarSelect label="Subject" value={subject} onChange={setSubject} options={subjectOptions} allLabel="All subjects" />
      </StickyFilterBar>

      <ListPageBody>
        <PageTitleRow
          title="My Courses"
          subtitle="Your teaching assignments this term"
          actions={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void load()}
              disabled={loading}
              sx={{ textTransform: 'none', fontWeight: 700, borderColor: brand.border }}
            >
              Refresh
            </Button>
          }
        />

        {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

        <NavyStats stats={stats} />

        {initialLoading ? (
          <PageLoading label="Loading courses…" />
        ) : !filtered.length ? (
          <SectionPaper title="Courses" count={0}>
            <EmptyState title="No courses found" description="Try another search or refresh." />
          </SectionPaper>
        ) : (
          filtered.map((group) => (
            <SectionPaper key={group.subjectName} title={group.subjectName} count={`${group.totalPeriods} periods / week`}>
              {group.classes.map((cls, idx) => (
                <Stack
                  key={`${group.subjectName}-${cls.className}`}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    px: 1.5,
                    py: 1.35,
                    bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                    borderBottom: idx < group.classes.length - 1 ? '1px solid rgba(19,33,61,0.06)' : 'none',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, color: brand.navy }}>
                      {cls.className}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 12, color: brand.muted }}>
                      {cls.periodsPerWeek} periods{cls.room ? ` · ${cls.room}` : ''}
                    </Typography>
                  </Box>
                  <Button
                    component={RouterLink}
                    to={`/assessments/create?subject=${encodeURIComponent(group.subjectName)}&className=${encodeURIComponent(cls.className)}${
                      cls.classId ? `&classId=${encodeURIComponent(cls.classId)}` : ''
                    }`}
                    size="small"
                    variant="outlined"
                    sx={{ flexShrink: 0, fontWeight: 700, borderColor: brand.border, fontSize: 12, textTransform: 'none' }}
                  >
                    New assessment
                  </Button>
                </Stack>
              ))}
            </SectionPaper>
          ))
        )}
      </ListPageBody>
    </ListPage>
  );
}
