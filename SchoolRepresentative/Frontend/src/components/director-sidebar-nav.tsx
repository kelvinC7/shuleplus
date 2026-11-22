'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SvgIconComponent } from '@mui/icons-material';
import { isNavActive } from '@/lib/nav-config';
import { brand } from '@/theme/theme';

type BadgeKey = 'approvals' | 'notifications' | 'tasks';
type Badges = { approvals?: number; notifications?: number; tasks?: number };

function BadgePill({ value }: { value: number }) {
  return (
    <Box
      component="span"
      sx={{
        minWidth: 20,
        height: 18,
        px: 0.6,
        borderRadius: 0,
        fontSize: 10,
        fontWeight: 800,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: brand.primary,
        color: brand.navy,
      }}
    >
      {value > 99 ? '99+' : value}
    </Box>
  );
}

/** One link row (same look as the Ticha portal sidebar). */
export function DirectorSidebarNavLink({
  label,
  href,
  icon: Icon,
  active,
  badge,
  onNavigate,
}: {
  label: string;
  href: string;
  icon?: SvgIconComponent;
  active?: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Box
      component={Link}
      href={href}
      onClick={onNavigate}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        minHeight: 40,
        px: 2,
        py: 0.75,
        borderRadius: 0,
        textDecoration: 'none',
        color: active ? brand.navy : 'rgba(255,255,255,0.72)',
        bgcolor: active ? brand.primary : 'transparent',
        border: '1px solid transparent',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        '&:hover': {
          bgcolor: active ? brand.primary : 'rgba(255,255,255,0.06)',
          color: active ? brand.navy : '#fff',
        },
      }}
    >
      {Icon ? <Icon sx={{ fontSize: 20, flexShrink: 0 }} /> : null}
      <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </Box>
      {badge != null && badge > 0 ? <BadgePill value={badge} /> : null}
    </Box>
  );
}

/** Collapsible group: icon + title + chevron, sub-links indented below. */
export function DirectorSidebarGroup({
  label,
  icon: Icon,
  items,
  pathname,
  badges,
  onNavigate,
}: {
  label: string;
  icon: SvgIconComponent;
  items: Array<{ label: string; href: string; icon: SvgIconComponent; badge?: BadgeKey }>;
  pathname: string;
  badges: Badges;
  onNavigate?: () => void;
}) {
  const hasActive = items.some((item) => isNavActive(pathname, item.href));
  const [open, setOpen] = useState(hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive, pathname]);

  const groupBadge = items.reduce((sum, item) => sum + (item.badge ? badges[item.badge] ?? 0 : 0), 0);

  return (
    <Box sx={{ mb: 0.25 }}>
      <Button
        fullWidth
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          justifyContent: 'flex-start',
          color: hasActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
          bgcolor: 'transparent',
          px: 2,
          py: 0.75,
          minHeight: 36,
          borderRadius: 0,
          fontSize: 11,
          fontWeight: hasActive ? 700 : 600,
          letterSpacing: '0.02em',
          textTransform: 'none',
          gap: 1.5,
          '& .MuiSvgIcon-root': { color: hasActive ? brand.primary : 'inherit' },
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.04)',
            color: hasActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)',
          },
        }}
      >
        <Icon sx={{ fontSize: 20 }} />
        <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>
          {label}
        </Box>
        {!open && groupBadge > 0 ? <BadgePill value={groupBadge} /> : null}
        <ExpandMoreIcon
          sx={{
            fontSize: 16,
            transform: open ? 'none' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
            opacity: 0.6,
          }}
        />
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ pl: 1.5, py: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {items.map((item) => (
            <DirectorSidebarNavLink
              key={item.href}
              label={item.label}
              href={item.href}
              active={isNavActive(pathname, item.href)}
              badge={item.badge ? badges[item.badge] : undefined}
              onNavigate={onNavigate}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
