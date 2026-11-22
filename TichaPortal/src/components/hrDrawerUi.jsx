import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { brand } from '../theme/theme';

export const HR_FONT = "'Montserrat', sans-serif";

const fieldSx = {
  width: '100%',
  px: 1.5,
  py: 1.25,
  bgcolor: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 1.5,
  color: '#334155',
  fontSize: 14,
  fontFamily: 'inherit',
  fontWeight: 500,
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
  '&::placeholder': { color: '#94A3B8' },
  '&:focus': { borderColor: 'rgba(178,106,0,0.5)', boxShadow: '0 0 0 3px rgba(245,166,35,0.2)' },
};

export function HrDrawer({ open, onClose, title, children, footer }) {
  return (
    <Drawer
      anchor="right"
      open={Boolean(open)}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: 576,
          bgcolor: '#fff',
          borderLeft: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: HR_FONT,
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: brand.navy }}>{title}</Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ color: '#94A3B8' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
      {footer ? (
        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0, px: 2.5, py: 2, borderTop: '1px solid rgba(0,0,0,0.05)', bgcolor: 'rgba(248,250,252,0.5)' }}>
          {footer}
        </Stack>
      ) : null}
    </Drawer>
  );
}

export function HrBtnPrimary({ children, icon: Icon, sx, ...props }) {
  return (
    <Button
      type="button"
      variant="contained"
      startIcon={Icon ? <Icon size={15} strokeWidth={1.75} /> : null}
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: 1.5,
        bgcolor: '#B26A00',
        color: '#fff',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        '&:hover': { bgcolor: '#B36D00' },
        '&.Mui-disabled': { opacity: 0.6 },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export function HrBtnOutline({ children, icon: Icon, sx, ...props }) {
  return (
    <Button
      type="button"
      variant="outlined"
      startIcon={Icon ? <Icon size={15} strokeWidth={1.75} /> : null}
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: 1.5,
        borderColor: '#E2E8F0',
        bgcolor: '#fff',
        color: '#475569',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        '&:hover': { bgcolor: '#F8FAFC', borderColor: '#CBD5E1' },
        '&.Mui-disabled': { opacity: 0.6 },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export function HrField({ label, required, children }) {
  return (
    <Box>
      <Box component="label" sx={{ display: 'block', color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.75, fontWeight: 500 }}>
        {label}
        {required ? <Box component="span" sx={{ color: '#B26A00', ml: 0.5 }}>*</Box> : null}
      </Box>
      {children}
    </Box>
  );
}

export function HrInput(props) {
  return <Box component="input" sx={fieldSx} {...props} />;
}

export function HrSelect({ value, onChange, children, ...props }) {
  return (
    <Box component="select" value={value} onChange={onChange} sx={{ ...fieldSx, cursor: 'pointer' }} {...props}>
      {children}
    </Box>
  );
}

export function HrTextarea(props) {
  return <Box component="textarea" sx={{ ...fieldSx, resize: 'none' }} {...props} />;
}
