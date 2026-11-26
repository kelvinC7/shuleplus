import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/Check';
import BottomSheet from './BottomSheet';
import api from '../services/api';
import { normalizeGradebookLabel } from '../utils/teacherGradebookUi';
import { brand } from '../theme/theme';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayNameOf = (iso) => DAY_NAMES[new Date(`${iso}T12:00:00`).getDay()];
const shift = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const fieldSx = {
  '& .MuiOutlinedInput-root': { fontSize: 13, fontWeight: 600, color: brand.navy, bgcolor: '#F8F9FC', borderRadius: 1 },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(19,33,61,0.08)' },
};

function SearchField({ value, onChange, placeholder }) {
  return (
    <TextField
      size="small"
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={fieldSx}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
          </InputAdornment>
        ),
      }}
    />
  );
}

function DateRow({ date, onChange }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <IconButton size="small" onClick={() => onChange(shift(date, -1))} aria-label="Previous day">
        <ChevronLeftIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <TextField size="small" type="date" fullWidth value={date} onChange={(e) => e.target.value && onChange(e.target.value)} sx={fieldSx} />
      <IconButton size="small" onClick={() => onChange(shift(date, 1))} aria-label="Next day">
        <ChevronRightIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Stack>
  );
}

function Label({ children }) {
  return (
    <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8', mb: 0.5 }}>
      {children}
    </Typography>
  );
}

function PickRow({ active, onClick, primary, secondary, trailing }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        textAlign: 'left',
        gap: 1.25,
        px: 1.5,
        py: 1.1,
        borderBottom: '1px solid rgba(19,33,61,0.06)',
        bgcolor: active ? 'rgba(19,33,61,0.05)' : '#fff',
        '&:hover': { bgcolor: 'rgba(19,33,61,0.04)' },
      }}
    >
      {trailing ? <Box sx={{ minWidth: 64 }}>{trailing}</Box> : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700, color: brand.navy }}>{primary}</Typography>
        {secondary ? <Typography noWrap sx={{ fontSize: 11.5, color: '#64748B' }}>{secondary}</Typography> : null}
      </Box>
      {active ? <CheckIcon sx={{ fontSize: 18, color: brand.navy }} /> : null}
    </ButtonBase>
  );
}

const listBoxSx = { border: '1px solid rgba(19,33,61,0.08)', borderRadius: 1, overflow: 'hidden', '& > :last-child': { borderBottom: 0 } };
const primaryBtnSx = {
  textTransform: 'none',
  fontWeight: 700,
  height: 44,
  bgcolor: brand.primary,
  color: brand.navy,
  boxShadow: 'none',
  '&:hover': { bgcolor: brand.primaryStrong, boxShadow: 'none' },
};

/* ------------------------------------------------------------------ */
/* Period attendance: pick date → pick a timetable lesson (or custom)   */
/* ------------------------------------------------------------------ */
export function PeriodStartModal({ open, onClose, date, onDateChange, lessons, classes, onPickLesson, onPickCustom }) {
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customClass, setCustomClass] = useState(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setShowAll(false);
      setCustomOpen(false);
    }
  }, [open]);

  const day = dayNameOf(date);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return lessons
      .filter((l) => showAll || l.day === day)
      .filter((l) => !needle || [l.subject, l.class_name, l.periodLabel, l.day].filter(Boolean).join(' ').toLowerCase().includes(needle))
      .sort((a, b) => (showAll ? String(a.day).localeCompare(String(b.day)) : 0) || String(a.time).localeCompare(String(b.time)));
  }, [lessons, q, showAll, day]);

  const customReady = customText.trim() && customClass;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Period attendance"
      subtitle="Which lesson are you taking?"
      height="88dvh"
      footer={
        <Box sx={{ width: '100%' }}>
          <ButtonBase
            onClick={() => setCustomOpen((v) => !v)}
            sx={{ width: '100%', justifyContent: 'flex-start', gap: 1, py: 0.75, fontSize: 13, fontWeight: 700, color: brand.navy }}
          >
            <EditOutlinedIcon sx={{ fontSize: 16 }} />
            Custom — type your own
          </ButtonBase>
          <Collapse in={customOpen}>
            <Stack spacing={1} sx={{ pt: 0.5, pb: 0.5 }}>
              <TextField size="small" fullWidth placeholder="Subject / activity" value={customText} onChange={(e) => setCustomText(e.target.value)} sx={fieldSx} />
              <TextField
                select
                size="small"
                fullWidth
                value={customClass || ''}
                onChange={(e) => setCustomClass(e.target.value)}
                sx={fieldSx}
                SelectProps={{ displayEmpty: true, MenuProps: { PaperProps: { sx: { maxHeight: 280 } } } }}
              >
                <MenuItem value="">Choose class</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
              <Button fullWidth variant="contained" disabled={!customReady} onClick={() => onPickCustom({ text: customText.trim(), className: customClass })} sx={primaryBtnSx}>
                Start attendance
              </Button>
            </Stack>
          </Collapse>
        </Box>
      }
    >
      <Stack spacing={1.5} sx={{ p: 2 }}>
        <Box>
          <Label>Date</Label>
          <DateRow date={date} onChange={onDateChange} />
        </Box>
        <Box>
          <Label>{showAll ? 'All lessons this week' : `Lessons on ${day}`}</Label>
          <Stack spacing={1}>
            <SearchField value={q} onChange={setQ} placeholder="Search subject or class…" />
            <Box sx={listBoxSx}>
              {list.length === 0 ? (
                <Typography sx={{ py: 3, px: 2, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                  {showAll ? 'No lessons found.' : `No lessons on ${day}.`}
                </Typography>
              ) : (
                list.map((l, i) => (
                  <PickRow
                    key={`${l.id}-${i}`}
                    onClick={() => onPickLesson(l)}
                    primary={l.subject || 'Lesson'}
                    secondary={[l.class_name, l.periodLabel, showAll && l.day].filter(Boolean).join(' · ')}
                    trailing={
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: brand.navy, fontVariantNumeric: 'tabular-nums' }}>
                        {l.time || '—'}
                      </Typography>
                    }
                  />
                ))
              )}
            </Box>
            <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}>
              {showAll ? `Only ${day}` : 'Show whole week'}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Choose a class (history prompts)                                     */
/* ------------------------------------------------------------------ */
export function ClassPickModal({ open, onClose, classes, value, onPick, title = 'Attendance history', subtitle = 'Choose a class' }) {
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) setQ('');
  }, [open]);
  const list = classes.filter((c) => !q.trim() || String(c).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle} height="80dvh">
      <Stack spacing={1.25} sx={{ p: 2 }}>
        <SearchField value={q} onChange={setQ} placeholder="Search class…" />
        <Box sx={listBoxSx}>
          {list.length === 0 ? (
            <Typography sx={{ py: 3, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No classes found.</Typography>
          ) : (
            list.map((c) => <PickRow key={c} active={c === value} primary={c} onClick={() => onPick(c)} />)
          )}
        </Box>
      </Stack>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Round roll call: date → class → existing rolls or a new roll name    */
/* ------------------------------------------------------------------ */
export function RollStartModal({ open, onClose, date, onDateChange, classes, initialClass = '', onStart }) {
  const [cls, setCls] = useState(initialClass);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (open) {
      setCls(initialClass || '');
      setQ('');
      setName('');
    }
  }, [open, initialClass]);

  useEffect(() => {
    if (!open || !cls || !date) {
      setSessions([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingSessions(true);
    api
      .get('/teacher-portal/round-roll-call/sessions', { params: { class_name: normalizeGradebookLabel(cls), date } })
      .then((res) => {
        if (!cancelled) setSessions(res.data?.success && Array.isArray(res.data.data?.sessions) ? res.data.data.sessions : []);
      })
      .catch(() => !cancelled && setSessions([]))
      .finally(() => !cancelled && setLoadingSessions(false));
    return () => {
      cancelled = true;
    };
  }, [open, cls, date]);

  const list = classes.filter((c) => !q.trim() || String(c).toLowerCase().includes(q.trim().toLowerCase()));
  const label = name.trim();

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Round roll call"
      subtitle="Start a roll"
      height="90dvh"
      footer={
        <Button fullWidth variant="contained" disabled={!cls || !label} onClick={() => onStart({ className: cls, rollName: label })} sx={primaryBtnSx}>
          Start roll
        </Button>
      }
    >
      <Stack spacing={1.75} sx={{ p: 2 }}>
        <Box>
          <Label>Date</Label>
          <DateRow date={date} onChange={onDateChange} />
        </Box>
        <Box>
          <Label>Class</Label>
          <Stack spacing={1}>
            <SearchField value={q} onChange={setQ} placeholder="Search class…" />
            <Box sx={{ ...listBoxSx, maxHeight: 200, overflowY: 'auto' }}>
              {list.length === 0 ? (
                <Typography sx={{ py: 2.5, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No classes found.</Typography>
              ) : (
                list.map((c) => <PickRow key={c} active={c === cls} primary={c} onClick={() => setCls(c)} />)
              )}
            </Box>
          </Stack>
        </Box>
        {cls ? (
          <Box>
            <Label>Rolls already taken for {cls}</Label>
            {loadingSessions ? (
              <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={18} /></Stack>
            ) : sessions.length ? (
              <Box sx={listBoxSx}>
                {sessions.map((s) => (
                  <PickRow key={s.id || s.roll_label} active={name === s.roll_label} primary={s.roll_label} secondary="Tap to open it" onClick={() => setName(s.roll_label)} />
                ))}
              </Box>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: '#94A3B8' }}>None yet on this date.</Typography>
            )}
          </Box>
        ) : null}
        <Box>
          <Label>Roll name</Label>
          <TextField size="small" fullWidth placeholder="e.g. Morning Prep" value={name} onChange={(e) => setName(e.target.value)} sx={fieldSx} />
        </Box>
      </Stack>
    </BottomSheet>
  );
}
