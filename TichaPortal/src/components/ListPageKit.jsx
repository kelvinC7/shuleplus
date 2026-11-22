import { Children, Fragment } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import SearchIcon from '@mui/icons-material/Search';
import { brand } from '../theme/theme';

/**
 * Shared building blocks for list pages so every page follows the same
 * pattern as /homework, /assessments and /marks:
 *
 *   <ListPage>
 *     <StickyTabs />        (optional status tabs)
 *     <StickyFilterBar>     (compact selects + search)
 *     <ListPageBody>
 *       <PageTitleRow />    (title, subtitle, primary action)
 *       <NavyStats />       (optional)
 *       <SectionPaper />    (content)
 *     </ListPageBody>
 *   </ListPage>
 */

export const NAVY = brand.navy;
export const MUTED = 'rgba(19,33,61,0.45)';
export const BORDER = 'rgba(19,33,61,0.08)';

export const barSelectSx = {
  fontSize: 12,
  fontWeight: 600,
  color: NAVY,
  bgcolor: 'transparent',
  '&:before, &:after': { borderBottom: 'none !important' },
  '& .MuiSelect-select': { py: 0.75, pr: '24px !important', bgcolor: 'transparent !important' },
  '& .MuiSelect-icon': { fontSize: 18 },
};

export const headCellSx = {
  py: 0.85,
  px: { xs: 1, sm: 1.5 },
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#94A3B8',
  bgcolor: '#F8F9FC',
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: 'nowrap',
};

export const cellSx = {
  py: 0.85,
  px: { xs: 1, sm: 1.5 },
  fontSize: 12.5,
  borderBottom: '1px solid rgba(19,33,61,0.05)',
};

export function ListPage({ children }) {
  return <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', pb: { xs: 10, md: 4 } }}>{children}</Box>;
}

/** Sticky status tabs (like Homework). `tabs` = [{ id, label }] */
export function StickyTabs({ tabs, value, onChange }) {
  return (
    <Box
      role="tablist"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 22,
        display: 'flex',
        bgcolor: '#fff',
        borderBottom: `1px solid ${BORDER}`,
        overflowX: 'auto',
      }}
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <ButtonBase
            key={t.id || 'all'}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            sx={{
              flex: 1,
              minWidth: 0,
              py: 1.2,
              px: 0.5,
              borderRadius: 0,
              fontSize: { xs: 11, sm: 12.5 },
              fontWeight: 700,
              color: active ? NAVY : 'rgba(19,33,61,0.45)',
              borderBottom: active ? `2px solid ${NAVY}` : '2px solid transparent',
              bgcolor: active ? 'rgba(19,33,61,0.03)' : 'transparent',
            }}
          >
            <Box component="span" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', px: 0.25 }}>
              {t.label}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** Non-sticky tab strip meant to live inside a SectionPaper card. */
export function CardTabs({ tabs, value, onChange }) {
  return (
    <Box
      role="tablist"
      sx={{ display: 'flex', overflowX: 'auto', bgcolor: '#fff', borderBottom: `1px solid ${BORDER}` }}
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <ButtonBase
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            sx={{
              flex: 1,
              minWidth: 56,
              py: 1.1,
              px: 0.5,
              borderRadius: 0,
              fontSize: { xs: 11, sm: 12.5 },
              fontWeight: 700,
              color: active ? NAVY : 'rgba(19,33,61,0.45)',
              borderBottom: active ? `2px solid ${NAVY}` : '2px solid transparent',
              bgcolor: active ? 'rgba(19,33,61,0.03)' : 'transparent',
            }}
          >
            {t.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

/** One borderless select in the sticky bar. */
export function BarSelect({ value, onChange, options, allLabel, label, flex = 1, hideOnMobile = false }) {
  return (
    <Box sx={{ flex, minWidth: 0, display: hideOnMobile ? { xs: 'none', sm: 'block' } : 'block' }}>
      <FormControl variant="standard" size="small" fullWidth>
        <Select
          variant="standard"
          disableUnderline
          displayEmpty
          value={value}
          onChange={(e) => onChange(e.target.value)}
          sx={barSelectSx}
          inputProps={{ 'aria-label': label }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
        >
          {allLabel != null ? <MenuItem value="">{allLabel}</MenuItem> : null}
          {options.map((o) => {
            const opt = typeof o === 'object' ? o : { value: o, label: o };
            return (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Box>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <SearchIcon sx={{ position: 'absolute', left: 0, fontSize: 16, color: 'rgba(19,33,61,0.3)', pointerEvents: 'none' }} />
      <Box
        component="input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        sx={{
          width: '100%',
          border: 'none',
          outline: 'none',
          bgcolor: 'transparent',
          pl: 2.75,
          pr: 0.5,
          py: 0.75,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'inherit',
          color: NAVY,
          '&::placeholder': { color: 'rgba(19,33,61,0.35)', fontWeight: 500 },
        }}
      />
    </Box>
  );
}

/**
 * Sticky filter bar. Children are <BarSelect/> items (dividers are added
 * automatically). Pass `search` + `onSearch` to add the search input
 * (inline on ≥sm, own row on mobile).
 */
export function StickyFilterBar({ children, search, onSearch, searchPlaceholder = 'Search…', top = 0 }) {
  const items = Children.toArray(children).filter(Boolean);
  const hasSearch = typeof onSearch === 'function';
  return (
    <Box
      sx={{
        position: 'sticky',
        top,
        zIndex: 20,
        width: '100%',
        bgcolor: '#fff',
        borderBottom: `1px solid ${BORDER}`,
        boxShadow: '0 2px 8px -4px rgba(19,33,61,0.12)',
      }}
    >
      <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 0.15 }}>
        {items.map((child, i) => (
          <Fragment key={child.key ?? i}>
            {i > 0 ? <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} /> : null}
            {child}
          </Fragment>
        ))}
        {hasSearch ? (
          <>
            {items.length ? (
              <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25, display: { xs: 'none', sm: 'block' } }} />
            ) : null}
            <Box sx={{ flex: 1.3, minWidth: 0, display: { xs: 'none', sm: 'flex' } }}>
              <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} />
            </Box>
          </>
        ) : null}
      </Stack>
      {hasSearch ? (
        <Box sx={{ display: { xs: 'block', sm: 'none' }, px: 1.5, py: 0.5, borderTop: `1px solid ${BORDER}` }}>
          <SearchInput value={search} onChange={onSearch} placeholder={searchPlaceholder} />
        </Box>
      ) : null}
    </Box>
  );
}

export function ListPageBody({ children }) {
  return (
    <Stack spacing={2} sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: { xs: 1.25, md: 2, lg: 2.5 } }}>
      {children}
    </Stack>
  );
}

/** Title + subtitle on the left, primary action(s) on the right. */
export function PageTitleRow({ title, subtitle, actions }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      justifyContent="space-between"
      spacing={1.25}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: NAVY }}>{title}</Typography>
        {subtitle ? <Typography sx={{ mt: 0.15, fontSize: 12, color: MUTED }}>{subtitle}</Typography> : null}
      </Box>
      {actions ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ '& > .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}

/** Navy squarish stats block: up to 4 tiles per row on every screen size. */
export function NavyStats({ stats }) {
  if (!stats?.length) return null;
  const cols = Math.min(stats.length, 4);
  const rows = Math.ceil(stats.length / cols);
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        border: `1px solid ${NAVY}`,
        overflow: 'hidden',
      }}
    >
      {stats.map((s, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <Box
            key={s.label}
            sx={{
              bgcolor: NAVY,
              color: '#fff',
              px: { xs: 1, sm: 1.75 },
              py: { xs: 1.1, sm: 1.5 },
              minHeight: { xs: 72, sm: 84 },
              minWidth: 0,
              borderRight: col < cols - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              borderBottom: row < rows - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 0.5,
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: 9, sm: 10 },
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                lineHeight: 1.25,
                color: 'rgba(255,255,255,0.65)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {s.label}
            </Typography>
            <Typography sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {s.value}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

/** Bordered white section card with optional title + count pill. */
export function SectionPaper({ title, count, action, children }) {
  return (
    <Paper component="section" elevation={0} sx={{ borderRadius: 2, border: `1px solid ${BORDER}`, bgcolor: '#fff', overflow: 'hidden' }}>
      {title || count != null || action ? (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
          {title ? <Typography sx={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{title}</Typography> : null}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {action}
            {count != null ? (
              <Box component="span" sx={{ borderRadius: 999, bgcolor: '#F1F5F9', px: 1, py: 0.25, fontSize: 10, fontWeight: 700, color: '#64748B' }}>
                {count}
              </Box>
            ) : null}
          </Box>
        </Stack>
      ) : null}
      {children}
    </Paper>
  );
}
