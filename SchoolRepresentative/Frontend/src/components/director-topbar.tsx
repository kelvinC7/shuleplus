'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ApartmentIcon from '@mui/icons-material/Apartment';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useConsole } from '@/contexts/console-context';
import { consoleApi } from '@/services/console-api';
import type { NotificationsData, SearchData } from '@/types';
import { relativeTime } from '@/lib/format';
import { pageTitleFromPath } from '@/lib/nav-config';
import { clearTokens } from '@/shared/auth-token';
import { brand } from '@/theme/theme';
import { scrollSx } from '@/theme/sx';

function toOption(entry: unknown): { value: string; label: string } {
  if (entry == null) return { value: '', label: '' };
  if (typeof entry === 'string' || typeof entry === 'number') {
    const str = String(entry);
    return { value: str, label: str };
  }
  const obj = entry as Record<string, unknown>;
  const value = String(obj.id ?? obj.value ?? obj.label ?? obj.name ?? '');
  const label = String(obj.label ?? obj.name ?? obj.id ?? obj.value ?? value);
  return { value, label };
}

export function DirectorTopbar({
  onMenuOpen,
  isMain = true,
}: {
  onMenuOpen: () => void;
  isMain?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const subTitle = pageTitleFromPath(pathname).title;
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/director/console');
  };
  const { ctx, user, scope, setBranch, setAcademicYear, setTerm, refresh, reload } = useConsole();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<NotificationsData | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchData | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const unread = notifications?.unread ?? ctx?.counts.unreadNotifications ?? 0;
  const pending = ctx?.counts.pendingApprovals ?? 0;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileAnchor(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 60);
    else {
      setSearch('');
      setResults(null);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    consoleApi
      .notifications()
      .then(setNotifications)
      .catch(() => setNotifications(null));
  }, [notificationsOpen, unread]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults(null);
      return;
    }
    const handle = setTimeout(() => {
      consoleApi
        .search(search.trim())
        .then(setResults)
        .catch(() => setResults(null));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const markRead = async (id: string) => {
    await consoleApi.markNotificationRead(id).catch(() => null);
    setNotifications((current) =>
      current
        ? {
            ...current,
            unread: Math.max(0, current.unread - 1),
            items: current.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
          }
        : current
    );
    refresh();
    void reload();
  };

  const markAllRead = async () => {
    await consoleApi.markAllNotificationsRead().catch(() => null);
    setNotifications((current) =>
      current ? { ...current, unread: 0, items: current.items.map((n) => ({ ...n, read: true })) } : current
    );
    refresh();
    void reload();
  };

  const signOut = () => {
    clearTokens();
    router.push('/');
  };

  const selectedBranch = ctx?.branches.find((b) => b.id === scope.organizationId);
  const branchInitials = selectedBranch
    ? selectedBranch.name
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AB';

  const academicYearOptions = (
    ctx?.academicYears?.length ? ctx.academicYears : scope.academicYear ? [scope.academicYear] : []
  ).map((year) => toOption(year));

  const termOptions = (ctx?.terms?.length ? ctx.terms : scope.term ? [scope.term] : []).map((term) =>
    toOption(term)
  );

  const selectSx = {
    fontSize: 12,
    fontWeight: 600,
    bgcolor: 'transparent',
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    '& .MuiSelect-select': { py: 0.75, pr: '28px !important' },
  };

  const mobileSelectSx = {
    fontSize: 12,
    fontWeight: 600,
    bgcolor: 'transparent',
    '&:before, &:after': { borderBottom: 'none' },
    '& .MuiSelect-select': { py: 0.75, pr: '28px !important' },
  };

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          zIndex: 30,
          ...(!isMain && {
            backgroundColor: { xs: brand.navy, lg: 'rgba(255,255,255,0.92)' },
            borderBottom: { xs: 'none', lg: `1px solid ${brand.border}` },
            color: { xs: '#fff', lg: 'inherit' },
          }),
        }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 1.5 }, px: { xs: 1.5, sm: 2.5 }, minHeight: 64 }}>
          {isMain ? (
            <IconButton
              onClick={onMenuOpen}
              aria-label="Open menu"
              sx={{ display: { lg: 'none' }, color: brand.navy }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <IconButton
              onClick={goBack}
              aria-label="Go back"
              sx={{ display: { lg: 'none' }, color: '#fff', ml: -0.5 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}

          {/* scope selectors — desktop */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, minWidth: 0, flex: 1, alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                borderRadius: 1.5,
                border: `1px solid ${brand.border}`,
                bgcolor: 'rgba(248,249,252,0.7)',
                p: 0.75,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2.5,
                  bgcolor: brand.navy,
                  color: brand.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {selectedBranch?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedBranch.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : selectedBranch ? (
                  branchInitials
                ) : (
                  <ApartmentIcon sx={{ fontSize: 16 }} />
                )}
              </Box>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={scope.organizationId || ''}
                  onChange={(e) => setBranch(e.target.value)}
                  displayEmpty
                  sx={selectSx}
                  renderValue={() => selectedBranch?.name ?? 'All branches'}
                >
                  <MenuItem value="">All branches</MenuItem>
                  {(ctx?.branches ?? []).map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
              <SchoolOutlinedIcon sx={{ fontSize: 16, color: brand.muted, ml: 0.5 }} />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={scope.academicYear || ''}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  displayEmpty
                  sx={selectSx}
                >
                  {academicYearOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: brand.muted }} />
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select value={scope.term || ''} onChange={(e) => setTerm(e.target.value)} displayEmpty sx={selectSx}>
                  {termOptions.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* mobile: branch label (scope controls sit in bar below) */}
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, flex: 1, minWidth: 0, alignItems: 'center' }}>
            <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: isMain ? brand.navy : '#fff' }}>
              {isMain ? (selectedBranch?.name ?? 'All branches') : subTitle}
            </Typography>
          </Box>

          {/* search trigger */}
          <Button
            onClick={() => setSearchOpen(true)}
            startIcon={<SearchIcon sx={{ fontSize: 18 }} />}
            sx={{
              display: { xs: 'none', sm: isMain ? 'inline-flex' : 'none', lg: 'inline-flex' },
              color: brand.muted,
              bgcolor: 'rgba(248,249,252,0.8)',
              border: `1px solid ${brand.border}`,
              borderRadius: 1.25,
              px: 1.5,
              py: 0.75,
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'none',
              minWidth: 180,
              justifyContent: 'flex-start',
              '&:hover': { bgcolor: '#fff', borderColor: brand.primary },
            }}
          >
            Search…
            <Box
              component="kbd"
              sx={{
                ml: 'auto',
                display: { xs: 'none', lg: 'inline' },
                fontSize: 10,
                fontWeight: 600,
                color: 'text.disabled',
                border: `1px solid ${brand.border}`,
                borderRadius: 1,
                px: 0.75,
                py: 0.25,
              }}
            >
              Ctrl K
            </Box>
          </Button>
          <IconButton onClick={() => setSearchOpen(true)} sx={{ display: isMain ? { sm: 'none' } : { xs: 'none', lg: 'none' }, color: brand.navy }} aria-label="Search">
            <SearchIcon />
          </IconButton>

          <IconButton
            onClick={() => {
              refresh();
              void reload();
            }}
            aria-label="Refresh"
            sx={{ color: isMain ? brand.navy : { xs: '#fff', lg: brand.navy } }}
          >
            <RefreshIcon />
          </IconButton>

          {/* pending approvals */}
          <Button
            component={Link}
            href="/director/approvals"
            startIcon={<AccessTimeIcon sx={{ fontSize: 14, color: brand.primary }} />}
            sx={{
              display: { xs: 'none', sm: isMain ? 'inline-flex' : 'none', lg: 'inline-flex' },
              bgcolor: brand.navy,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              px: 1.5,
              py: 0.75,
              borderRadius: 1.25,
              '&:hover': { bgcolor: brand.navy2 },
            }}
          >
            {pending} pending
          </Button>

          {/* notifications */}
          <IconButton onClick={() => setNotificationsOpen(true)} aria-label="Notifications" sx={{ display: isMain ? 'inline-flex' : { xs: 'none', lg: 'inline-flex' }, color: brand.navy }}>
            <Badge badgeContent={unread > 99 ? '99+' : unread} color="error" invisible={unread === 0}>
              <NotificationsNoneOutlinedIcon />
            </Badge>
          </IconButton>

          {/* profile */}
          <IconButton
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            aria-label="Account menu"
            sx={{ p: 0.75, display: isMain ? 'inline-flex' : { xs: 'none', lg: 'inline-flex' } }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: brand.navy,
                color: brand.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {user?.name
                ?.split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase() ?? 'DR'}
            </Box>
          </IconButton>
          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { width: 224, mt: 1 } }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${brand.border}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{user?.name ?? 'Director'}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email ?? ''}
              </Typography>
            </Box>
            <MenuItem
              component={Link}
              href="/director/settings"
              onClick={() => setProfileAnchor(null)}
              sx={{ fontSize: 13, gap: 1 }}
            >
              <PersonOutlineIcon fontSize="small" /> Settings
            </MenuItem>
            <MenuItem onClick={signOut} sx={{ fontSize: 13, gap: 1, color: brand.danger }}>
              <LogoutIcon fontSize="small" /> Sign out
            </MenuItem>
          </Menu>
        </Toolbar>

        {/* mobile scope bar — full-width row under main topbar */}
        <Box
          sx={{
            display: { xs: 'flex', lg: 'none' },
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            borderTop: `1px solid ${brand.border}`,
            bgcolor: 'rgba(248,249,252,0.95)',
          }}
        >
          <FormControl variant="standard" size="small" sx={{ flex: 1.4, minWidth: 0 }}>
            <Select
              value={scope.organizationId || ''}
              onChange={(e) => setBranch(e.target.value)}
              displayEmpty
              fullWidth
              variant="standard"
              sx={mobileSelectSx}
              renderValue={() => selectedBranch?.name ?? 'All branches'}
            >
              <MenuItem value="">All branches</MenuItem>
              {(ctx?.branches ?? []).map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
          <FormControl variant="standard" size="small" sx={{ flex: 1, minWidth: 0 }}>
            <Select
              value={scope.academicYear || ''}
              onChange={(e) => setAcademicYear(e.target.value)}
              displayEmpty
              fullWidth
              variant="standard"
              sx={mobileSelectSx}
            >
              {academicYearOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
          <FormControl variant="standard" size="small" sx={{ flex: 0.85, minWidth: 0 }}>
            <Select
              value={scope.term || ''}
              onChange={(e) => setTerm(e.target.value)}
              displayEmpty
              fullWidth
              variant="standard"
              sx={mobileSelectSx}
            >
              {termOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </AppBar>

      {/* Search drawer */}
      <Drawer
        anchor="top"
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        PaperProps={{
          sx: {
            maxWidth: 640,
            mx: 'auto',
            mt: { xs: 0, sm: 2 },
            borderRadius: { xs: 0, sm: 1.25 },
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <TextField
            inputRef={searchRef}
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students, staff, approvals…"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchOpen(false)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {results ? (
            <List dense sx={{ mt: 1, maxHeight: 360, overflow: 'auto' }}>
              {(results.items ?? []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                  No results for “{search}”.
                </Typography>
              ) : (
                (results.items ?? []).map((item) => (
                  <ListItemButton
                    key={item.id}
                    component={Link}
                    href={item.href || '#'}
                    onClick={() => setSearchOpen(false)}
                  >
                    <ListItemText
                      primary={item.title}
                      secondary={item.subtitle}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: 13 }}
                      secondaryTypographyProps={{ fontSize: 12 }}
                    />
                  </ListItemButton>
                ))
              )}
            </List>
          ) : null}
        </Box>
      </Drawer>

      {/* Notifications drawer */}
      <Drawer
        anchor="right"
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: `1px solid ${brand.border}` }}>
          <Typography sx={{ fontWeight: 700, color: brand.navy }}>Notifications</Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {unread > 0 ? (
              <Button size="small" onClick={() => void markAllRead()} sx={{ fontSize: 11 }}>
                Mark all read
              </Button>
            ) : null}
            <IconButton size="small" onClick={() => setNotificationsOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ ...scrollSx, flex: 1 }}>
          {!notifications?.items?.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              No notifications right now.
            </Typography>
          ) : (
            notifications.items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  px: 2.5,
                  py: 1.75,
                  borderBottom: `1px solid ${brand.border}`,
                  bgcolor: item.read ? 'transparent' : 'rgba(252,176,56,0.06)',
                  '&:hover': { bgcolor: 'rgba(248,249,252,0.8)' },
                }}
              >
                <Box
                  sx={{
                    mt: 0.25,
                    width: 32,
                    height: 32,
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor:
                      item.severity === 'urgent'
                        ? 'rgba(214,69,69,0.12)'
                        : item.severity === 'warning'
                          ? 'rgba(217,144,19,0.14)'
                          : 'rgba(0,4,53,0.06)',
                    color:
                      item.severity === 'urgent'
                        ? brand.danger
                        : item.severity === 'warning'
                          ? brand.warning
                          : brand.muted,
                  }}
                >
                  <WarningAmberOutlinedIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.5 }}>
                    {item.body}
                  </Typography>
                  <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1, fontSize: 10, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase' }}>
                    <span>{item.category}</span>·<span>{relativeTime(item.createdAt)}</span>
                    {item.link ? (
                      <Link href={item.link} onClick={() => setNotificationsOpen(false)} style={{ marginLeft: 'auto', color: '#b5771a' }}>
                        Open
                      </Link>
                    ) : null}
                  </Box>
                </Box>
                {!item.read ? (
                  <IconButton size="small" onClick={() => void markRead(item.id)} title="Mark as read">
                    <CheckIcon fontSize="small" />
                  </IconButton>
                ) : null}
              </Box>
            ))
          )}
        </Box>
      </Drawer>
    </>
  );
}
