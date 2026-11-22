'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CheckIcon from '@mui/icons-material/Check';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhonelinkIcon from '@mui/icons-material/Phonelink';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import { toast } from 'sonner';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { StatusBadge } from '@/components/status-badge';
import { useConsole } from '@/contexts/console-context';
import { clearTokens } from '@/shared/auth-token';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { SvgIconComponent } from '@mui/icons-material';

const PREFS_KEY = 'DirectorConsole_preferences';

interface Preferences {
  emailDigest: boolean;
  pushAlerts: boolean;
  weeklyBriefing: boolean;
  approvalEscalations: boolean;
  compactTables: boolean;
  showDemoHints: boolean;
}

const DEFAULT_PREFS: Preferences = {
  emailDigest: true,
  pushAlerts: true,
  weeklyBriefing: true,
  approvalEscalations: true,
  compactTables: false,
  showDemoHints: true,
};

const PERMISSIONS = [
  { label: 'Approve or reject executive requests', detail: 'Approvals centre · decisions are audited', granted: true },
  { label: 'View learner records', detail: 'Student directory and profile details', granted: true },
  { label: 'Access campus camera streams', detail: 'Live Campus · every access is logged', granted: true },
  { label: 'Send broadcasts to parents and staff', detail: 'SMS, email and the Shule+ app', granted: true },
  { label: 'Export consolidated reports', detail: 'PDF, Excel and print', granted: true },
  { label: 'Manage module settings across branches', detail: 'Restricted to platform admins', granted: false },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, ctx, scope } = useConsole();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
    toast.success('Preference saved');
  };

  const signOut = () => {
    clearTokens();
    router.push('/');
  };

  const resetPrefs = () => {
    setPrefs(DEFAULT_PREFS);
    localStorage.setItem(PREFS_KEY, JSON.stringify(DEFAULT_PREFS));
    toast.success('Preferences reset');
  };

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader title="Settings" description="Profile, permissions and console preferences." />

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
        <PanelCard title="Profile" subtitle="Signed-in director">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: brand.navy,
                color: brand.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              {(user?.name ?? 'DR')
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, color: brand.navy }}>{user?.name ?? 'Director'}</Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{user?.email ?? '—'}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
                <StatusBadge value={ctx?.user?.mode === 'demo' ? 'demo' : 'live'} />
                <StatusBadge value="director" tone="info" />
              </Stack>
            </Box>
          </Stack>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Active branch scope</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {scope.organizationId === 'all'
                  ? 'All branches'
                  : (ctx?.branches.find((b) => b.id === scope.organizationId)?.name ?? scope.organizationId)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Academic period</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {scope.term} · {scope.academicYear}
              </Typography>
            </Stack>
          </Stack>
        </PanelCard>

        <PanelCard title="Permissions" subtitle="What this session can do">
          <List disablePadding>
            {PERMISSIONS.map((p) => (
              <ListItem key={p.label} divider sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {p.granted ? (
                    <CheckIcon sx={{ color: brand.success, fontSize: 18 }} />
                  ) : (
                    <VpnKeyOutlinedIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={<Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{p.label}</Typography>}
                  secondary={<Typography sx={{ fontSize: 11 }}>{p.detail}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        </PanelCard>

        <PanelCard title="Notifications" subtitle="How the console reaches you">
          <PreferenceList
            items={[
              {
                key: 'emailDigest',
                icon: MailOutlineIcon,
                label: 'Daily email digest',
                hint: 'Summary of approvals, attendance and fee alerts',
              },
              {
                key: 'pushAlerts',
                icon: PhonelinkIcon,
                label: 'Push alerts',
                hint: 'Urgent items while the console is open',
              },
              {
                key: 'weeklyBriefing',
                icon: CampaignOutlinedIcon,
                label: 'Weekly briefing',
                hint: 'Monday morning executive summary',
              },
              {
                key: 'approvalEscalations',
                icon: NotificationsNoneOutlinedIcon,
                label: 'Approval escalations',
                hint: 'Notify when items wait longer than 24 hours',
              },
            ]}
            prefs={prefs}
            onToggle={(key) => updatePref(key, !prefs[key])}
          />
        </PanelCard>

        <PanelCard title="Display" subtitle="Console layout preferences">
          <PreferenceList
            items={[
              {
                key: 'compactTables',
                icon: TuneOutlinedIcon,
                label: 'Compact tables',
                hint: 'Denser rows on list pages',
              },
              {
                key: 'showDemoHints',
                icon: VerifiedUserOutlinedIcon,
                label: 'Demo-mode hints',
                hint: 'Show demo badge and sample-data notices',
              },
            ]}
            prefs={prefs}
            onToggle={(key) => updatePref(key, !prefs[key])}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={resetPrefs} sx={{ fontWeight: 700, borderColor: brand.border }}>
              Reset preferences
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={signOut}
              sx={{ fontWeight: 700, ml: 'auto' }}
            >
              Sign out
            </Button>
          </Stack>
          <Typography sx={{ mt: 1.5, fontSize: 10, color: 'text.secondary' }}>
            Signing out clears the module token on this device. Reopen from Shule+ to sign in again.
          </Typography>
        </PanelCard>
      </Box>
    </Box>
  );
}

function PreferenceList({
  items,
  prefs,
  onToggle,
}: {
  items: Array<{ key: keyof Preferences; icon: SvgIconComponent; label: string; hint: string }>;
  prefs: Preferences;
  onToggle: (key: keyof Preferences) => void;
}) {
  return (
    <List disablePadding>
      {items.map(({ key, icon: Icon, label, hint }) => (
        <ListItem key={key} divider sx={{ px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: 'rgba(0,4,53,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: brand.muted,
              }}
            >
              <Icon sx={{ fontSize: 16 }} />
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={<Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{label}</Typography>}
            secondary={<Typography sx={{ fontSize: 11 }}>{hint}</Typography>}
          />
          <ListItemSecondaryAction>
            <Switch
              edge="end"
              checked={prefs[key]}
              onChange={() => onToggle(key)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: brand.primary },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: brand.primary },
              }}
            />
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
}
