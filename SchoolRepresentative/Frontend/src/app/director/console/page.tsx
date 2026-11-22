'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import ButtonBase from '@mui/material/ButtonBase';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DirectorPageHeader } from '@/components/director-page-header';
import { useConsole } from '@/contexts/console-context';
import { NAV_GROUPS } from '@/lib/nav-config';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';

/**
 * Solid card tones, cycled across every card so they spread evenly:
 * brand navy, brand amber and a light tone.
 */
const CARD_TONES = [
  { bg: brand.navy, border: brand.navy, text: '#FFFFFF', icon: brand.primary, arrow: 'rgba(255,255,255,0.6)', badgeBg: brand.primary, badgeText: brand.navy },
  { bg: brand.primary, border: brand.primary, text: brand.navy, icon: brand.navy, arrow: brand.navy, badgeBg: brand.navy, badgeText: brand.primary },
  { bg: '#EEF1F8', border: 'rgba(0,4,53,0.08)', text: brand.navy, icon: brand.navy, arrow: brand.muted, badgeBg: brand.primary, badgeText: brand.navy },
] as const;

export default function ConsolePage() {
  const { ctx } = useConsole();

  const badges = {
    approvals: ctx?.counts.pendingApprovals ?? 0,
    notifications: ctx?.counts.unreadNotifications ?? 0,
    tasks: ctx?.counts.overdueTasks ?? 0,
  };

  const items = NAV_GROUPS.flatMap((group) => group.items).filter(
    (item) => item.href !== '/director/console'
  );
  let cardIndex = 0;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Console"
        description="Everything in the Director Console. Tap a card to open it."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          gap: { xs: 1.25, sm: 1.5 },
        }}
      >
                {items.map((item) => {
                  const Icon = item.icon;
                  const count = item.badge ? badges[item.badge] : 0;
                  const tone = CARD_TONES[cardIndex++ % CARD_TONES.length];
                  return (
                    <Card
                      key={item.href}
                      sx={{
                        borderRadius: 0,
                        overflow: 'hidden',
                        bgcolor: tone.bg,
                        border: `1px solid ${tone.border}`,
                        boxShadow: 'none',
                      }}
                    >
                      <ButtonBase
                        component={Link}
                        href={item.href}
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
                          position: 'relative',
                          '&:active': { opacity: 0.88 },
                        }}
                      >
                        <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <Icon sx={{ fontSize: 28, color: tone.icon }} />
                          {count > 0 ? (
                            <Box
                              component="span"
                              sx={{
                                minWidth: 22,
                                height: 20,
                                px: 0.75,
                                borderRadius: 0,
                                bgcolor: tone.badgeBg,
                                color: tone.badgeText,
                                fontSize: 11,
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {count > 99 ? '99+' : count}
                            </Box>
                          ) : null}
                        </Box>
                        <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: tone.text, lineHeight: 1.3 }}>
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
  );
}
