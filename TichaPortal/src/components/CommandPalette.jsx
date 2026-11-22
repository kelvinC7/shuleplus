import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import SearchIcon from '@mui/icons-material/Search';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import GradingOutlinedIcon from '@mui/icons-material/GradingOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import WalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import HistoryIcon from '@mui/icons-material/History';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/theme';

const OPEN_EVENT = 'tp:open-command-palette';
const RECENT_KEY = 'tp_cmdk_recent';

/** Open the palette from anywhere (e.g. a search button). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function isMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || '');
}

const ic = (Icon) => <Icon sx={{ fontSize: 19 }} />;

// group: 'Quick actions' | 'Go to' | 'Account'
const COMMANDS = [
  // ── Quick actions
  { id: 'a-attendance', group: 'Quick actions', label: 'Take period attendance', to: '/period-attendance', icon: ic(FactCheckOutlinedIcon), keywords: 'roll call register present absent' },
  { id: 'a-scan', group: 'Quick actions', label: 'Scan to enter class', to: '/class-room-scan', icon: ic(QrCodeScannerOutlinedIcon), keywords: 'qr clock in exit' },
  { id: 'a-record', group: 'Quick actions', label: 'Record marks', to: '/marks/marks-center?record=1', icon: ic(EditNoteOutlinedIcon), keywords: 'grades scores enter' },
  { id: 'a-assess', group: 'Quick actions', label: 'Create assessment', to: '/assessments/create', icon: ic(QuizOutlinedIcon), keywords: 'test exam quiz new' },
  { id: 'a-plan', group: 'Quick actions', label: 'Generate lesson plan', to: '/lesson-planning/generate', icon: ic(NoteAddOutlinedIcon), keywords: 'ai new lesson' },
  { id: 'a-ai', group: 'Quick actions', label: 'Ask Ticha AI', to: '/ticha-ai', icon: ic(AutoAwesomeOutlinedIcon), keywords: 'assistant chat help' },
  { id: 'a-avance', group: 'Quick actions', label: 'Request Ticha Avance', to: '/shule-avance', icon: ic(WalletOutlinedIcon), keywords: 'advance loan money salary' },

  // ── Go to
  { id: 'g-home', group: 'Go to', label: 'Dashboard', to: '/', icon: ic(SpaceDashboardOutlinedIcon), keywords: 'home overview' },
  { id: 'g-students', group: 'Go to', label: 'Students', to: '/students', icon: ic(PeopleOutlineIcon), keywords: 'class list learners pupils' },
  { id: 'g-teaching', group: 'Go to', label: 'My Teaching', to: '/my-teaching', icon: ic(SchoolOutlinedIcon), keywords: 'lessons classes' },
  { id: 'g-courses', group: 'Go to', label: 'My Courses', to: '/my-courses', icon: ic(MenuBookOutlinedIcon), keywords: 'subjects' },
  { id: 'g-homework', group: 'Go to', label: 'Homework', to: '/homework', icon: ic(AssignmentOutlinedIcon), keywords: 'assignments' },
  { id: 'g-timetable', group: 'Go to', label: 'Timetable', to: '/timetable', icon: ic(EventNoteOutlinedIcon), keywords: 'schedule periods' },
  { id: 'g-exams', group: 'Go to', label: 'Examinations', to: '/examinations', icon: ic(GradingOutlinedIcon), keywords: 'exam room' },
  { id: 'g-assessments', group: 'Go to', label: 'Assessments', to: '/assessments/schedule', icon: ic(QuizOutlinedIcon), keywords: 'tests schedule' },
  { id: 'g-marks', group: 'Go to', label: 'Marks hub', to: '/marks', icon: ic(GradingOutlinedIcon), keywords: 'grades results analytics' },
  { id: 'g-plans', group: 'Go to', label: 'All lesson plans', to: '/lesson-planning/all', icon: ic(AutoStoriesOutlinedIcon), keywords: 'planning' },
  { id: 'g-book', group: 'Go to', label: 'Download plan book', to: '/lesson-planning/book', icon: ic(AutoStoriesOutlinedIcon), keywords: 'lesson plan pdf' },
  { id: 'g-perf', group: 'Go to', label: 'Course performance', to: '/lesson-planning/performance', icon: ic(TrendingUpOutlinedIcon), keywords: 'analytics progress' },
  { id: 'g-avance', group: 'Go to', label: 'Ticha Avance', to: '/shule-avance', icon: ic(WalletOutlinedIcon), keywords: 'advance loan' },
  { id: 'g-payroll', group: 'Go to', label: 'My Payroll', to: '/payroll', icon: ic(PaymentsOutlinedIcon), keywords: 'salary payslip' },
  { id: 'g-repay', group: 'Go to', label: 'Repayment Schedule', to: '/repayment-schedule', icon: ic(ReceiptLongOutlinedIcon), keywords: 'avance installments' },
  { id: 'g-deals', group: 'Go to', label: 'Ticha Deals', to: '/ticha-deals', icon: ic(ShoppingBagOutlinedIcon), keywords: 'shop store' },
  { id: 'g-perms', group: 'Go to', label: 'Permissions', to: '/permissions', icon: ic(SettingsOutlinedIcon), keywords: 'leave request' },
  { id: 'g-cal', group: 'Go to', label: 'School calendar', to: '/school-calendar', icon: ic(CalendarMonthOutlinedIcon), keywords: 'events dates term' },
  { id: 'g-parents', group: 'Go to', label: 'Parent messages', to: '/parent-messages', icon: ic(ForumOutlinedIcon), keywords: 'chat inbox' },
  { id: 'g-chat', group: 'Go to', label: 'Chat center', to: '/chat', icon: ic(ChatBubbleOutlineIcon), keywords: 'messages' },
  { id: 'g-req', group: 'Go to', label: 'Requisitions', to: '/requisitions', icon: ic(ReceiptLongOutlinedIcon), keywords: 'procurement' },
  { id: 'g-purchase', group: 'Go to', label: 'Purchase requests', to: '/purchase-requests', icon: ic(ShoppingCartOutlinedIcon), keywords: 'procurement buy' },
  { id: 'g-english', group: 'Go to', label: 'English Club', to: '/english-club', icon: ic(TranslateOutlinedIcon), keywords: '' },
  { id: 'g-yo', group: 'Go to', label: 'yoInfo', to: '/yoinfo', icon: ic(NewspaperOutlinedIcon), keywords: 'news feed' },
  { id: 'g-console', group: 'Go to', label: 'Console', to: '/console', icon: ic(GridViewRoundedIcon), keywords: 'apps all' },

  // ── Account
  { id: 'c-profile', group: 'Account', label: 'My Profile', to: '/profile', icon: ic(PersonOutlineIcon), keywords: 'account settings' },
  { id: 'c-logout', group: 'Account', label: 'Log out', action: 'logout', icon: ic(LogoutIcon), keywords: 'sign out exit' },
];

const GROUP_ORDER = ['Quick actions', 'Go to', 'Account'];

function readRecent() {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function writeRecent(id) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, 4);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — recents are a nicety */
  }
}

/** Score a command against the typed query tokens; null = no match. */
function score(cmd, tokens) {
  const label = cmd.label.toLowerCase();
  const words = label.split(/\s+/);
  const extra = `${cmd.group} ${cmd.keywords || ''}`.toLowerCase();
  let total = 0;
  for (const t of tokens) {
    if (label.startsWith(t)) total += 4;
    else if (words.some((w) => w.startsWith(t))) total += 3;
    else if (label.includes(t)) total += 2;
    else if (extra.includes(t)) total += 1;
    else return null;
  }
  return total;
}

function Highlight({ text, token }) {
  if (!token) return text;
  const i = text.toLowerCase().indexOf(token);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <Box component="span" sx={{ fontWeight: 800, color: brand.navy }}>
        {text.slice(i, i + token.length)}
      </Box>
      {text.slice(i + token.length)}
    </>
  );
}

function Kbd({ children, sx }) {
  return (
    <Box
      component="kbd"
      sx={{
        fontFamily: 'inherit',
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1,
        px: 0.75,
        py: 0.5,
        borderRadius: 0.75,
        border: `1px solid ${brand.border}`,
        bgcolor: '#F4F5F8',
        color: brand.muted,
        display: 'inline-flex',
        alignItems: 'center',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export default function CommandPalette() {
  const isDesktop = useMediaQuery('(min-width:1200px)');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState([]);
  const listRef = useRef(null);
  const mac = useMemo(() => isMacPlatform(), []);

  // Global shortcut + custom open event
  useEffect(() => {
    if (!isDesktop) return undefined;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [isDesktop]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setRecent(readRecent());
    }
  }, [open]);

  const tokens = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);

  // Rows: with a query → ranked flat list; empty → Recent + grouped
  const rows = useMemo(() => {
    if (tokens.length) {
      return COMMANDS.map((cmd, i) => ({ cmd, s: score(cmd, tokens), i }))
        .filter((r) => r.s !== null)
        .sort((a, b) => b.s - a.s || a.i - b.i)
        .map((r) => ({ cmd: r.cmd, section: null }));
    }
    const out = [];
    const recentCmds = recent.map((id) => COMMANDS.find((c) => c.id === id)).filter(Boolean);
    recentCmds.forEach((cmd) => out.push({ cmd, section: 'Recent', recent: true }));
    GROUP_ORDER.forEach((g) => {
      COMMANDS.filter((c) => c.group === g).forEach((cmd) => out.push({ cmd, section: g }));
    });
    return out;
  }, [tokens, recent]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, rows]);

  const close = useCallback(() => setOpen(false), []);

  const run = useCallback(
    (cmd) => {
      if (!cmd) return;
      writeRecent(cmd.id);
      setOpen(false);
      if (cmd.action === 'logout') {
        logout?.();
        navigate('/login');
      } else if (cmd.to) {
        navigate(cmd.to);
      }
    },
    [logout, navigate]
  );

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (rows.length ? (a + 1) % rows.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (rows.length ? (a - 1 + rows.length) % rows.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(rows[active]?.cmd);
    }
  };

  if (!isDesktop) return null;

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth={false}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(11,18,32,0.45)', backdropFilter: 'blur(2px)' } } }}
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '14vh',
          m: 0,
          width: 'min(640px, 92vw)',
          borderRadius: 1.5,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(11,18,32,0.35)',
          backgroundImage: 'none',
        },
      }}
    >
      {/* Input */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.5, borderBottom: `1px solid ${brand.border}` }}>
        <SearchIcon sx={{ color: brand.muted, fontSize: 22 }} />
        <InputBase
          autoFocus
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder="Search pages or run an action…"
          inputProps={{ 'aria-label': 'Search', autoComplete: 'off', spellCheck: false }}
          sx={{ fontSize: 16, fontWeight: 500, color: brand.navy }}
        />
        <Kbd>Esc</Kbd>
      </Box>

      {/* Results */}
      <Box ref={listRef} sx={{ maxHeight: 400, overflowY: 'auto', py: 0.75 }}>
        {rows.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>No results</Typography>
            <Typography sx={{ fontSize: 12.5, color: brand.muted, mt: 0.25 }}>
              Nothing matches “{query}”. Try a page name like “marks” or “timetable”.
            </Typography>
          </Box>
        ) : (
          rows.map((row, idx) => {
            const showHeader = !tokens.length && (idx === 0 || rows[idx - 1].section !== row.section);
            const isActive = idx === active;
            return (
              <Box key={`${row.section}-${row.cmd.id}`}>
                {showHeader ? (
                  <Typography
                    sx={{
                      px: 2,
                      pt: idx === 0 ? 0.75 : 1.5,
                      pb: 0.5,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#94A3B8',
                    }}
                  >
                    {row.section}
                  </Typography>
                ) : null}
                <Box
                  data-idx={idx}
                  role="option"
                  aria-selected={isActive}
                  onMouseMove={() => active !== idx && setActive(idx)}
                  onClick={() => run(row.cmd)}
                  sx={{
                    mx: 0.75,
                    px: 1.25,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    cursor: 'pointer',
                    borderRadius: 1,
                    bgcolor: isActive ? 'rgba(19,33,61,0.06)' : 'transparent',
                    color: brand.muted,
                  }}
                >
                  <Box sx={{ display: 'flex', color: isActive ? brand.navy : brand.muted }}>
                    {row.recent ? <HistoryIcon sx={{ fontSize: 19 }} /> : row.cmd.icon}
                  </Box>
                  <Typography noWrap sx={{ flex: 1, fontSize: 14, fontWeight: 500, color: isActive ? brand.navy : '#3B4558' }}>
                    <Highlight text={row.cmd.label} token={tokens[0]} />
                  </Typography>
                  {tokens.length || row.recent ? (
                    <Typography sx={{ fontSize: 11.5, color: '#94A3B8' }}>{row.cmd.group}</Typography>
                  ) : null}
                  {isActive ? <KeyboardReturnIcon sx={{ fontSize: 15, color: '#94A3B8' }} /> : null}
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer hints */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2,
          py: 1,
          borderTop: `1px solid ${brand.border}`,
          bgcolor: '#FAFBFC',
          color: '#94A3B8',
          fontSize: 11.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navigate
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Kbd>↵</Kbd> open
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Kbd>{mac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd> toggle
        </Box>
      </Box>
    </Dialog>
  );
}
