import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { brand } from '../../theme/theme';
import { pageSx } from '../../theme/sx';

export function Page({ children, maxWidth = 1120, dense }) {
  return (
    <Box sx={{ ...pageSx, minHeight: '100%', pb: { xs: 10, lg: 3 } }}>
      <Box sx={{ mx: 'auto', maxWidth, px: { xs: 2, sm: 2.5 }, py: dense ? 1.5 : { xs: 2, sm: 2.5 } }}>
        {children}
      </Box>
    </Box>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.25}
      alignItems={{ sm: 'center' }}
      justifyContent="space-between"
      sx={{ mb: 2 }}
    >
      <Box sx={{ minWidth: 0 }}>
        {title ? (
          <Typography sx={{ fontSize: { xs: 18, sm: 20 }, fontWeight: 600, color: brand.navy, letterSpacing: '-0.02em' }}>
            {title}
          </Typography>
        ) : null}
        {description ? (
          <Typography sx={{ mt: 0.35, fontSize: 13, color: brand.muted, maxWidth: 520, lineHeight: 1.45 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}

export function Panel({ title, subtitle, action, children, bodySx, sx }) {
  return (
    <Paper
      variant="outlined"
      sx={{ overflow: 'hidden', borderColor: brand.border, ...sx }}
    >
      {(title || action) && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 1.75,
            py: 1.25,
            borderBottom: `1px solid ${brand.border}`,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {title ? (
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: brand.navy }}>{title}</Typography>
            ) : null}
            {subtitle ? (
              <Typography sx={{ fontSize: 12, color: brand.muted }}>{subtitle}</Typography>
            ) : null}
          </Box>
          {action}
        </Stack>
      )}
      <Box sx={{ p: 1.75, ...bodySx }}>{children}</Box>
    </Paper>
  );
}

export function SearchField({ value, onChange, placeholder = 'Search…', sx }) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      sx={sx}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </InputAdornment>
        ),
      }}
    />
  );
}

export function PageLoading({ label = 'Loading…' }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.25} sx={{ py: 8 }}>
      <CircularProgress size={22} thickness={4} sx={{ color: brand.navy }} />
      <Typography sx={{ fontSize: 13, color: brand.muted }}>{label}</Typography>
    </Stack>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, action, icon }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 5, px: 2, textAlign: 'center' }}>
      <Box sx={{ color: brand.muted, opacity: 0.7, display: 'flex' }}>
        {icon || <InboxOutlinedIcon sx={{ fontSize: 28 }} />}
      </Box>
      <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: 14 }}>{title}</Typography>
      {description ? (
        <Typography sx={{ fontSize: 13, color: brand.muted, maxWidth: 320, lineHeight: 1.45 }}>
          {description}
        </Typography>
      ) : null}
      {action}
    </Stack>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        ) : null
      }
      sx={{ borderRadius: 1.5, mb: 2 }}
    >
      {message || 'Something went wrong'}
    </Alert>
  );
}

export function KpiGrid({ children, columns = 4 }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.25,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: columns >= 3 ? `repeat(${Math.min(columns, 3)}, 1fr)` : 'repeat(2, 1fr)',
          md: `repeat(${columns}, 1fr)`,
        },
        mb: 2,
      }}
    >
      {children}
    </Box>
  );
}

/** Quiet stat cell — no icon chrome by default */
export function Kpi({ label, value, hint, icon }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderColor: brand.border }}>
      <Typography sx={{ fontSize: 11, fontWeight: 500, color: brand.muted }}>{label}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 600, color: brand.navy, lineHeight: 1.2, mt: 0.35 }}>
        {value}
      </Typography>
      {hint ? (
        <Typography sx={{ fontSize: 11, color: brand.muted, mt: 0.25 }}>{hint}</Typography>
      ) : null}
    </Paper>
  );
}
