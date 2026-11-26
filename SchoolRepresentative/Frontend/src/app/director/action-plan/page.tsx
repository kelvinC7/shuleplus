'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AddIcon from '@mui/icons-material/Add';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { toast } from 'sonner';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { DetailDrawer, DrawerSection, FieldList } from '@/components/detail-drawer';
import { StatusBadge } from '@/components/status-badge';
import { KpiCard, StatsGrid } from '@/components/stat-card';
import { EmptyState, ErrorState, PageLoading, SearchInput } from '@/components/list-ui';
import { SegmentedTabs } from '@/components/form-kit';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { apiErrorMessage } from '@/services/api';
import { formatDate } from '@/lib/format';
import {
  TASK_STATE_API,
  buildIcs,
  dateFromKey,
  dayKeyOf,
  downloadTextFile,
  inviteText,
  isOverdue,
  isUpcoming,
  relativeDayLabel,
  sortTasks,
  taskState,
  timeRange,
  todayKey,
  type TaskState,
} from '@/lib/action-plan';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { MeetingItem, MeetingsData, TaskItem, TasksData } from '@/types';
import { NewItemSheet, type CreateMode } from './new-item-sheet';

type TabKey = 'tasks' | 'meetings';
type TaskFilter = 'all' | TaskState | 'overdue';
type MeetingFilter = 'all' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

const TASK_FILTERS: Array<{ value: TaskFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'progress', label: 'In progress' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'done', label: 'Done' },
];

const MEETING_FILTERS: Array<{ value: MeetingFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATE_LABEL: Record<TaskState, string> = { open: 'Open', progress: 'In progress', done: 'Done' };

function FilterPills<T extends string>({
  value,
  onChange,
  options,
  counts,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, mx: -0.25, px: 0.25 }}>
      {options.map((o) => {
        const active = o.value === value;
        const n = counts?.[o.value];
        return (
          <ButtonBase
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            sx={{
              flexShrink: 0,
              px: 1.5,
              py: 0.55,
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              bgcolor: active ? brand.navy : '#F2F4F8',
              color: active ? '#fff' : brand.navy,
              gap: 0.6,
            }}
          >
            {o.label}
            {n ? <Box component="span" sx={{ opacity: 0.6 }}>{n}</Box> : null}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

export default function ActionPlanPage() {
  const router = useRouter();
  const { scope, refreshKey, refresh } = useConsole();

  const tasksFetch = useConsoleFetch<TasksData>(() => consoleApi.tasks({ ...scope }), [scope.organizationId, refreshKey]);
  const meetingsFetch = useConsoleFetch<MeetingsData>(
    () => consoleApi.meetings({ organizationId: scope.organizationId }),
    [scope.organizationId, refreshKey]
  );

  const [tab, setTab] = useState<TabKey>('tasks');
  const [creating, setCreating] = useState<CreateMode | null>(null);
  const [busy, setBusy] = useState(false);

  // tasks
  const [search, setSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [selected, setSelected] = useState<TaskItem | null>(null);
  const [draftState, setDraftState] = useState<TaskState>('open');
  const [draftProgress, setDraftProgress] = useState(0);

  // meetings
  const [meetingSearch, setMeetingSearch] = useState('');
  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>('all');
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const create = params.get('create');
    const wantsMeetings = params.get('tab') === 'meetings' || create === 'meeting';
    if (wantsMeetings) setTab('meetings');
    if (create === 'meeting') setCreating('meeting');
    if (create === 'task') {
      setTab('tasks');
      setCreating('task');
    }
    if (wantsMeetings || create) router.replace('/director/action-plan', { scroll: false });
  }, [router]);

  /* ───────── tasks ───────── */

  const allTasks = useMemo(() => tasksFetch.data?.items ?? [], [tasksFetch.data]);

  const taskCounts = useMemo(() => {
    const c = { all: allTasks.length, open: 0, progress: 0, done: 0, overdue: 0 };
    allTasks.forEach((t) => {
      c[taskState(t)] += 1;
      if (isOverdue(t)) c.overdue += 1;
    });
    return c;
  }, [allTasks]);

  const tasks = useMemo(() => {
    let rows = allTasks;
    if (taskFilter === 'overdue') rows = rows.filter(isOverdue);
    else if (taskFilter !== 'all') rows = rows.filter((t) => taskState(t) === taskFilter);
    const n = search.trim().toLowerCase();
    if (n) rows = rows.filter((t) => `${t.title} ${t.owner} ${t.priority} ${t.description ?? ''}`.toLowerCase().includes(n));
    return sortTasks(rows);
  }, [allTasks, taskFilter, search]);

  const openTask = (task: TaskItem) => {
    setSelected(task);
    setDraftState(taskState(task));
    setDraftProgress(taskState(task) === 'done' ? 100 : Math.round(task.progress ?? 0));
  };

  const patchTask = async (task: TaskItem, body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      await consoleApi.updateTask(task.id, body);
      toast.success(success);
      setSelected(null);
      refresh();
      void tasksFetch.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Update failed'));
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = (task: TaskItem) =>
    taskState(task) === 'done'
      ? patchTask(task, { status: TASK_STATE_API.open, progress: 0 }, 'Task reopened')
      : patchTask(task, { status: TASK_STATE_API.done, progress: 100 }, 'Marked complete');

  const saveTaskDraft = () => {
    if (!selected) return;
    const progress = draftState === 'done' ? 100 : draftState === 'open' ? 0 : Math.min(99, Math.max(1, draftProgress));
    void patchTask(selected, { status: TASK_STATE_API[draftState], progress }, 'Task updated');
  };

  const draftChanged =
    selected !== null &&
    (draftState !== taskState(selected) ||
      (draftState === 'progress' && draftProgress !== Math.round(selected.progress ?? 0)));

  /* ───────── meetings ───────── */

  const allMeetings = useMemo(() => meetingsFetch.data?.items ?? [], [meetingsFetch.data]);

  const meetingCounts = useMemo(
    () => ({
      all: allMeetings.length,
      SCHEDULED: allMeetings.filter((m) => m.status === 'SCHEDULED').length,
      COMPLETED: allMeetings.filter((m) => m.status === 'COMPLETED').length,
      CANCELLED: allMeetings.filter((m) => m.status === 'CANCELLED').length,
    }),
    [allMeetings]
  );

  const upcomingCount = useMemo(() => allMeetings.filter(isUpcoming).length, [allMeetings]);

  const { upcoming, past } = useMemo(() => {
    let rows = allMeetings;
    if (meetingFilter !== 'all') rows = rows.filter((m) => m.status === meetingFilter);
    const n = meetingSearch.trim().toLowerCase();
    if (n) {
      rows = rows.filter((m) =>
        `${m.title} ${m.location ?? ''} ${m.participants.join(' ')} ${m.agenda.join(' ')}`.toLowerCase().includes(n)
      );
    }
    const key = (m: MeetingItem) => `${dayKeyOf(m.meetingDate)} ${(m.startTime ?? '').slice(0, 5)}`;
    return {
      upcoming: rows.filter(isUpcoming).sort((a, b) => (key(a) < key(b) ? -1 : 1)),
      past: rows.filter((m) => !isUpcoming(m)).sort((a, b) => (key(a) < key(b) ? 1 : -1)),
    };
  }, [allMeetings, meetingFilter, meetingSearch]);

  const changeMeetingStatus = async (status: 'COMPLETED' | 'CANCELLED') => {
    if (!selectedMeeting) return;
    setBusy(true);
    try {
      await consoleApi.updateMeeting(selectedMeeting.id, { status });
      toast.success(status === 'COMPLETED' ? 'Meeting completed' : 'Meeting cancelled');
      setSelectedMeeting(null);
      refresh();
      void meetingsFetch.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update meeting'));
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async (m: MeetingItem) => {
    try {
      await navigator.clipboard.writeText(inviteText(m));
      toast.success('Invite copied');
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access');
    }
  };

  const addToCalendar = (m: MeetingItem) => {
    downloadTextFile(`${m.title.replace(/[^\w-]+/g, '-').slice(0, 40) || 'meeting'}.ics`, buildIcs(m));
  };

  const onCreated = (mode: CreateMode) => {
    setCreating(null);
    refresh();
    if (mode === 'task') {
      setTab('tasks');
      void tasksFetch.reload();
    } else {
      setTab('meetings');
      void meetingsFetch.reload();
    }
  };

  const activeFetch = tab === 'tasks' ? tasksFetch : meetingsFetch;
  if (activeFetch.loading && !activeFetch.data) {
    return <PageLoading label={tab === 'tasks' ? 'Loading action plan…' : 'Loading meetings…'} />;
  }
  if (activeFetch.error && !activeFetch.data) {
    return <ErrorState message={activeFetch.error} onRetry={activeFetch.reload} />;
  }

  const stats = tasksFetch.data?.stats;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Action Plan"
        description={
          tab === 'tasks'
            ? 'School improvement commitments with owners and deadlines.'
            : 'Leadership meetings, agendas and outcomes.'
        }
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreating(tab === 'tasks' ? 'task' : 'meeting')}
            sx={{ fontWeight: 700 }}
          >
            {tab === 'tasks' ? 'New task' : 'New meeting'}
          </Button>
        }
      />

      <Box sx={{ maxWidth: 340, mb: 2.5 }}>
        <SegmentedTabs
          value={tab}
          onChange={(v) => setTab(v)}
          options={[
            { value: 'tasks', label: 'Tasks' },
            { value: 'meetings', label: 'Meetings' },
          ]}
        />
      </Box>

      {tab === 'tasks' ? (
        <>
          <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
            <StatsGrid columns={4} sx={{ gap: { xs: 0, sm: 2 } }}>
              <KpiCard label="Open" value={stats?.open ?? taskCounts.open} icon={<ChecklistOutlinedIcon sx={{ fontSize: 20 }} />} />
              <KpiCard label="In progress" value={stats?.inProgress ?? taskCounts.progress} icon={<HourglassEmptyIcon sx={{ fontSize: 20 }} />} valueSx={{ color: '#b5771a' }} />
              <KpiCard label="Completed" value={stats?.completed ?? taskCounts.done} icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />} />
              <KpiCard
                label="Overdue"
                value={stats?.overdue ?? taskCounts.overdue}
                icon={<ErrorOutlineIcon sx={{ fontSize: 20 }} />}
                valueSx={(stats?.overdue ?? taskCounts.overdue) > 0 ? { color: brand.danger } : undefined}
              />
            </StatsGrid>
          </Box>

          <PanelCard title="Tasks" subtitle={`${tasks.length} of ${allTasks.length}`} bodySx={{ px: 0, pt: 0 }}>
            <Box sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
              <SearchInput value={search} onChange={setSearch} placeholder="Search tasks, owners…" variant="standard" sx={{ width: '100%', mb: 1.5 }} />
              <FilterPills value={taskFilter} onChange={setTaskFilter} options={TASK_FILTERS} counts={taskCounts} />
            </Box>
            {!tasks.length ? (
              <EmptyState title="No tasks match" hint={allTasks.length ? 'Try another filter.' : 'Create the first task to get started.'} />
            ) : (
              <Box>
                {tasks.map((task) => {
                  const state = taskState(task);
                  const overdue = isOverdue(task);
                  const done = state === 'done';
                  const progress = done ? 100 : Math.round(task.progress ?? 0);
                  return (
                    <Box
                      key={task.id}
                      onClick={() => openTask(task)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2.5,
                        py: 1.5,
                        borderTop: `1px solid ${brand.border}`,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#F6F7FB' },
                      }}
                    >
                      <ButtonBase
                        aria-label={done ? 'Reopen task' : 'Mark complete'}
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleDone(task);
                        }}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          flexShrink: 0,
                          border: `2px solid ${done ? brand.success : '#C9CEDB'}`,
                          bgcolor: done ? brand.success : 'transparent',
                          color: '#fff',
                          '&:hover': { borderColor: brand.success },
                        }}
                      >
                        {done ? <CheckRoundedIcon sx={{ fontSize: 16 }} /> : null}
                      </ButtonBase>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          noWrap
                          sx={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: done ? brand.muted : brand.navy,
                            textDecoration: done ? 'line-through' : 'none',
                          }}
                        >
                          {task.title}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 12, color: overdue ? brand.danger : brand.muted, fontWeight: overdue ? 700 : 400 }}>
                          {task.owner}
                          {task.dueDate ? ` · ${overdue ? 'Overdue since' : 'Due'} ${formatDate(task.dueDate)}` : ''}
                        </Typography>
                        {state === 'progress' ? (
                          <Box sx={{ mt: 0.75, height: 3, borderRadius: 2, bgcolor: '#E9ECF2', maxWidth: 220 }}>
                            <Box sx={{ width: `${progress}%`, height: '100%', borderRadius: 2, bgcolor: brand.primary }} />
                          </Box>
                        ) : null}
                      </Box>
                      <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                        <StatusBadge value={task.priority} />
                      </Box>
                      <StatusBadge label={overdue ? 'Overdue' : STATE_LABEL[state]} tone={overdue ? 'danger' : state === 'done' ? 'success' : state === 'progress' ? 'warning' : 'neutral'} />
                    </Box>
                  );
                })}
              </Box>
            )}
          </PanelCard>
        </>
      ) : (
        <>
          <Box sx={{ mb: { xs: 2, sm: 2.5 } }}>
            <StatsGrid columns={3} sx={{ gap: { xs: 0, sm: 2 } }}>
              <KpiCard label="Upcoming" value={upcomingCount} icon={<EventOutlinedIcon sx={{ fontSize: 20 }} />} />
              <KpiCard label="Completed" value={meetingCounts.COMPLETED} icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />} />
              <KpiCard
                label="Cancelled"
                value={meetingCounts.CANCELLED}
                icon={<CancelOutlinedIcon sx={{ fontSize: 20 }} />}
                valueSx={meetingCounts.CANCELLED ? { color: brand.danger } : undefined}
              />
            </StatsGrid>
          </Box>

          <PanelCard title="Meetings" subtitle={`${upcoming.length + past.length} of ${allMeetings.length}`} bodySx={{ px: 0, pt: 0 }}>
            <Box sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
              <SearchInput value={meetingSearch} onChange={setMeetingSearch} placeholder="Search title, venue, people…" variant="standard" sx={{ width: '100%', mb: 1.5 }} />
              <FilterPills value={meetingFilter} onChange={setMeetingFilter} options={MEETING_FILTERS} counts={meetingCounts} />
            </Box>
            {!upcoming.length && !past.length ? (
              <EmptyState title="No meetings match" hint={allMeetings.length ? 'Try another filter.' : 'Schedule your first leadership meeting.'} />
            ) : (
              <Box>
                {upcoming.length ? <MeetingGroup label="Upcoming" meetings={upcoming} onOpen={setSelectedMeeting} /> : null}
                {past.length ? <MeetingGroup label="Past & closed" meetings={past} onOpen={setSelectedMeeting} muted /> : null}
              </Box>
            )}
          </PanelCard>
        </>
      )}

      {/* task details */}
      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Task'}
        status={selected ? <StatusBadge label={isOverdue(selected) ? 'Overdue' : STATE_LABEL[taskState(selected)]} tone={isOverdue(selected) ? 'danger' : undefined} /> : undefined}
        width="md"
        footer={
          selected ? (
            <Button fullWidth variant="contained" color="secondary" disabled={busy || !draftChanged} onClick={saveTaskDraft}>
              Save changes
            </Button>
          ) : undefined
        }
      >
        {selected ? (
          <>
            <DrawerSection title="Progress">
              <SegmentedTabs
                value={draftState}
                onChange={(v) => {
                  setDraftState(v);
                  if (v === 'progress' && (draftProgress <= 0 || draftProgress >= 100)) setDraftProgress(50);
                }}
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'progress', label: 'In progress' },
                  { value: 'done', label: 'Done' },
                ]}
              />
              {draftState === 'progress' ? (
                <Box sx={{ px: 1 }}>
                  <Slider
                    value={draftProgress}
                    onChange={(_, v) => setDraftProgress(v as number)}
                    min={5}
                    max={95}
                    step={5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `${v}%`}
                    aria-label="Progress"
                    sx={{ color: brand.primary }}
                  />
                  <Typography sx={{ fontSize: 12, color: brand.muted, textAlign: 'center' }}>{draftProgress}% complete</Typography>
                </Box>
              ) : null}
            </DrawerSection>
            <DrawerSection title="Details">
              <FieldList
                items={[
                  { label: 'Owner', value: selected.owner },
                  { label: 'Priority', value: <StatusBadge value={selected.priority} /> },
                  { label: 'Due', value: formatDate(selected.dueDate) },
                  ...(selected.category ? [{ label: 'Category', value: selected.category }] : []),
                  { label: 'Notes', value: selected.notes ?? selected.description ?? '—' },
                ]}
              />
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      {/* meeting details */}
      <DetailDrawer
        open={Boolean(selectedMeeting)}
        onClose={() => setSelectedMeeting(null)}
        title={selectedMeeting?.title ?? 'Meeting'}
        subtitle={selectedMeeting ? `${relativeDayLabel(dayKeyOf(selectedMeeting.meetingDate))} · ${timeRange(selectedMeeting)}` : undefined}
        status={selectedMeeting ? <StatusBadge value={selectedMeeting.status} /> : undefined}
        width="md"
        footer={
          selectedMeeting && selectedMeeting.status === 'SCHEDULED' ? (
            <Stack direction="row" spacing={1}>
              <Button fullWidth variant="contained" color="secondary" disabled={busy} onClick={() => void changeMeetingStatus('COMPLETED')}>
                Mark completed
              </Button>
              <Button
                fullWidth
                variant="outlined"
                disabled={busy}
                onClick={() => void changeMeetingStatus('CANCELLED')}
                sx={{ borderColor: brand.danger, color: brand.danger, '&:hover': { borderColor: brand.danger, bgcolor: 'rgba(214,69,69,0.06)' } }}
              >
                Cancel meeting
              </Button>
            </Stack>
          ) : undefined
        }
      >
        {selectedMeeting ? (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
              <Button size="small" variant="outlined" startIcon={<ContentCopyOutlinedIcon />} onClick={() => void copyInvite(selectedMeeting)} sx={{ borderColor: brand.border, color: brand.navy }}>
                Copy invite
              </Button>
              <Button size="small" variant="outlined" startIcon={<CalendarMonthOutlinedIcon />} onClick={() => addToCalendar(selectedMeeting)} sx={{ borderColor: brand.border, color: brand.navy }}>
                Add to calendar
              </Button>
            </Stack>
            <DrawerSection title="Details">
              <FieldList
                items={[
                  { label: 'Date', value: formatDate(selectedMeeting.meetingDate) },
                  { label: 'Time', value: timeRange(selectedMeeting) },
                  { label: 'Venue', value: selectedMeeting.location ?? '—' },
                  { label: 'Organised by', value: selectedMeeting.createdByName ?? '—' },
                  { label: 'Notes', value: selectedMeeting.description ?? '—' },
                ]}
              />
            </DrawerSection>
            <DrawerSection title={`Participants (${selectedMeeting.participants.length})`}>
              {selectedMeeting.participants.length ? (
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {selectedMeeting.participants.map((person) => (
                    <Box key={person} sx={{ px: 1.25, py: 0.5, borderRadius: 999, bgcolor: '#F2F4F8', fontSize: 12, fontWeight: 600 }}>
                      {person}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: brand.muted }}>No participants added.</Typography>
              )}
            </DrawerSection>
            <DrawerSection title="Agenda">
              {selectedMeeting.agenda.length ? (
                <Box component="ol" sx={{ m: 0, pl: 2.25, fontSize: 12.5, lineHeight: 1.8, color: brand.navy }}>
                  {selectedMeeting.agenda.map((item, i) => (
                    <li key={`${i}-${item}`}>{item}</li>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: brand.muted }}>No agenda items added.</Typography>
              )}
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <NewItemSheet
        open={creating !== null}
        mode={creating ?? 'task'}
        onMode={setCreating}
        onClose={() => setCreating(null)}
        organizationId={scope.organizationId}
        onCreated={onCreated}
      />
    </Box>
  );
}

function MeetingGroup({
  label,
  meetings,
  onOpen,
  muted,
}: {
  label: string;
  meetings: MeetingItem[];
  onOpen: (m: MeetingItem) => void;
  muted?: boolean;
}) {
  const today = todayKey();
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ display: 'block', px: 2.5, py: 0.75, bgcolor: '#F8F9FC', color: brand.muted, fontSize: 11, borderTop: `1px solid ${brand.border}` }}
      >
        {label} · {meetings.length}
      </Typography>
      {meetings.map((m) => {
        const key = dayKeyOf(m.meetingDate);
        const d = key ? dateFromKey(key) : null;
        const isToday = key === today;
        return (
          <Box
            key={m.id}
            onClick={() => onOpen(m)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.75,
              px: 2.5,
              py: 1.5,
              borderTop: `1px solid ${brand.border}`,
              cursor: 'pointer',
              opacity: muted ? 0.75 : 1,
              '&:hover': { bgcolor: '#F6F7FB', opacity: 1 },
            }}
          >
            <Box
              sx={{
                width: 46,
                flexShrink: 0,
                textAlign: 'center',
                borderRadius: 2,
                py: 0.6,
                bgcolor: isToday ? brand.primary : '#F2F4F8',
                color: brand.navy,
              }}
            >
              <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.2, opacity: 0.7 }}>
                {d ? d.toLocaleDateString('en-GB', { month: 'short' }) : '—'}
              </Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.15 }}>{d ? d.getDate() : '—'}</Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700, color: brand.navy, textDecoration: m.status === 'CANCELLED' ? 'line-through' : 'none' }}>
                {m.title}
              </Typography>
              <Typography noWrap sx={{ fontSize: 12, color: brand.muted }}>
                {isToday ? 'Today · ' : ''}
                {timeRange(m)}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 0.25, color: brand.muted }}>
                {m.location ? (
                  <Stack direction="row" spacing={0.4} alignItems="center" sx={{ minWidth: 0 }}>
                    <PlaceOutlinedIcon sx={{ fontSize: 14 }} />
                    <Typography noWrap sx={{ fontSize: 11.5 }}>{m.location}</Typography>
                  </Stack>
                ) : null}
                <Stack direction="row" spacing={0.4} alignItems="center">
                  <GroupsOutlinedIcon sx={{ fontSize: 14 }} />
                  <Typography sx={{ fontSize: 11.5 }}>{m.participants.length}</Typography>
                </Stack>
              </Stack>
            </Box>
            {m.status !== 'SCHEDULED' ? <StatusBadge value={m.status} /> : null}
          </Box>
        );
      })}
    </Box>
  );
}
