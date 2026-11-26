import { useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import ButtonBase from '@mui/material/ButtonBase';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import { useAuth } from '../context/AuthContext';
import { brand } from '../theme/theme';

const SERVICE_GROUPS = [
  {
    title: 'Pay & finance',
    items: [
      { label: 'Ticha Avance', icon: AccountBalanceWalletOutlinedIcon, path: '/shule-avance' },
      { label: 'Ticha Deals', icon: ShoppingBagOutlinedIcon, path: '/ticha-deals' },
      { label: 'My payroll', icon: PaymentsOutlinedIcon, path: '/payroll' },
      { label: 'Repayments', icon: PaidOutlinedIcon, path: '/repayment-schedule', warn: true },
    ],
  },
  {
    title: 'School',
    items: [
      { label: 'Class attendance', icon: FactCheckOutlinedIcon, path: '/class-attendance' },
      { label: 'My attendance', icon: HowToRegOutlinedIcon, path: '/my-attendance' },
      { label: 'Students attendance', icon: GroupsIcon, path: '/class-students-attendance' },
      { label: 'Classroom scan', icon: QrCodeScannerOutlinedIcon, path: '/class-room-scan', warn: true },
      { label: 'Assessments', icon: AssignmentOutlinedIcon, path: '/assessments/schedule' },
      { label: 'Permissions', icon: VerifiedUserOutlinedIcon, path: '/permissions' },
      { label: 'Calendar', icon: CalendarMonthOutlinedIcon, path: '/school-calendar', warn: true },
      { label: 'Parent messages', icon: ChatOutlinedIcon, path: '/chat', warn: true },
      { label: 'Requisitions', icon: Inventory2OutlinedIcon, path: '/requisitions' },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'English Club', icon: TranslateIcon, path: '/english-club' },
      { label: 'Ticha AI', icon: AutoAwesomeIcon, path: '/ticha-ai' },
      { label: 'My profile', icon: PersonOutlineIcon, path: '/profile' },
      { label: 'Help & support', icon: HelpOutlineIcon, action: 'help' },
    ],
  },
];

const CARD_TONES = [
  {
    bg: brand.navy,
    border: brand.navy,
    text: '#FFFFFF',
    icon: brand.primary,
    arrow: 'rgba(255,255,255,0.6)',
    badgeBg: brand.primary,
  },
  {
    bg: brand.primary,
    border: brand.primary,
    text: brand.navy,
    icon: brand.navy,
    arrow: brand.navy,
    badgeBg: brand.navy,
  },
  {
    bg: '#EEF1F8',
    border: 'rgba(0,4,53,0.08)',
    text: brand.navy,
    icon: brand.navy,
    arrow: brand.muted,
    badgeBg: brand.primary,
  },
];

export default function Console() {
  const { teacher } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const schoolName = teacher?.school?.name || teacher?.school_name || 'Your school';

  let cardIndex = 0;

  return (
    <Box sx={{ minHeight: '100%', pb: 4, p: { xs: 1.5, sm: 2 }, maxWidth: 1000, mx: 'auto' }}>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: brand.navy, letterSpacing: '-0.01em' }}>
        Console
      </Typography>
      <Typography sx={{ mt: 0.35, mb: 2.5, fontSize: 13, color: brand.muted }}>
        School services and tools. Tap a card to open it.
      </Typography>

      {SERVICE_GROUPS.map((group) => (
        <Box key={group.title} sx={{ mb: 2.5 }}>
          <Typography
            sx={{
              px: 0.25,
              mb: 1,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: brand.muted,
            }}
          >
            {group.title}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
              gap: { xs: 1.25, sm: 1.5 },
            }}
          >
            {group.items.map((item) => {
              const Icon = item.icon;
              const tone = CARD_TONES[cardIndex++ % CARD_TONES.length];
              return (
                <Card
                  key={`${group.title}-${item.label}`}
                  sx={{
                    borderRadius: 0,
                    overflow: 'hidden',
                    bgcolor: tone.bg,
                    border: `1px solid ${tone.border}`,
                    boxShadow: 'none',
                  }}
                >
                  <ButtonBase
                    {...(item.action === 'help'
                      ? { onClick: () => setHelpOpen(true) }
                      : { component: Link, to: item.path })}
                    sx={{
                      width: '100%',
                      height: '100%',
                      minHeight: 112,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      p: 1.75,
                      gap: 1.5,
                      '&:active': { opacity: 0.88 },
                    }}
                  >
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Icon sx={{ fontSize: 28, color: tone.icon }} />
                      {item.warn ? (
                        <Box component="span" sx={{ width: 8, height: 8, bgcolor: tone.badgeBg }} />
                      ) : null}
                    </Box>
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: tone.text,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.label}
                      </Typography>
                      <ChevronRightIcon sx={{ fontSize: 18, color: tone.arrow, flexShrink: 0 }} />
                    </Box>
                  </ButtonBase>
                </Card>
              );
            })}
          </Box>
        </Box>
      ))}

      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: { xs: '20px 20px 0 0', sm: 2 } } }}
        sx={{ '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } } }}
      >
        <DialogContent sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: brand.navy }}>Help &amp; support</Typography>
            <IconButton onClick={() => setHelpOpen(false)} aria-label="Close" size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          {[
            ['Shule+ helpdesk', '0788 300 300 • Mon–Sat, 7:00–19:00'],
            ['Email', 'support@shuleplus.rw'],
            ['School office', `${schoolName} • ask for the ShuleTicha administrator`],
          ].map(([label, value]) => (
            <Box key={label} sx={{ mt: 1.5, borderRadius: 1.5, bgcolor: brand.background, px: 1.75, py: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{label}</Typography>
              <Typography sx={{ fontSize: 12, color: brand.muted }}>{value}</Typography>
            </Box>
          ))}
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={() => setHelpOpen(false)}
            sx={{ mt: 2, py: 1.25, fontWeight: 700, textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
