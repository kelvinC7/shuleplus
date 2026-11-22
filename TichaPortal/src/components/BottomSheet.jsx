import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { brand } from '../theme/theme';

export default function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 768,
  height = '92dvh',
  desktopWidth,
}) {
  // Desktop (lg+): centered dialog. Mobile / tablet: bottom sheet (unchanged).
  const isDesktop = useMediaQuery('(min-width:1200px)');
  const hasHeader = Boolean(title || subtitle);

  if (isDesktop) {
    return (
      <Dialog
        open={Boolean(open)}
        onClose={onClose}
        scroll="paper"
        transitionDuration={{ enter: 180, exit: 120 }}
        aria-label={typeof subtitle === 'string' ? subtitle : typeof title === 'string' ? title : 'Dialog'}
        slotProps={{
          backdrop: { sx: { bgcolor: 'rgba(11,18,32,0.45)', backdropFilter: 'blur(2px)' } },
        }}
        PaperProps={{
          sx: {
            position: 'relative',
            width: '100%',
            maxWidth: desktopWidth ?? Math.min(maxWidth, 560),
            m: 2,
            maxHeight: 'min(86dvh, 780px)',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundImage: 'none',
            border: `1px solid ${brand.border}`,
            boxShadow: '0 24px 60px rgba(11,18,32,0.28)',
          },
        }}
      >
        {hasHeader ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ px: 3, py: 2, borderBottom: `1px solid ${brand.border}`, flexShrink: 0 }}
          >
            <Box sx={{ minWidth: 0 }}>
              {title && (
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, color: brand.muted }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography noWrap sx={{ fontSize: 16, fontWeight: 700, color: brand.navy, letterSpacing: '-0.01em' }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close"
              sx={{ color: brand.muted, '&:hover': { bgcolor: 'rgba(19,33,61,0.06)', color: brand.navy } }}
            >
              <CloseIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Stack>
        ) : (
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 1,
              color: brand.muted,
              '&:hover': { bgcolor: 'rgba(19,33,61,0.06)', color: brand.navy },
            }}
          >
            <CloseIcon sx={{ fontSize: 19 }} />
          </IconButton>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': { width: 8 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(19,33,61,0.18)', borderRadius: 8 },
          }}
        >
          {children}
        </Box>

        {footer && (
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{ px: 3, py: 1.75, borderTop: `1px solid ${brand.border}`, bgcolor: '#FAFBFC', flexShrink: 0 }}
          >
            {footer}
          </Stack>
        )}
      </Dialog>
    );
  }

  return (
    <Drawer
      anchor="bottom"
      open={Boolean(open)}
      onClose={onClose}
      ModalProps={{ keepMounted: false }}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth,
          mx: 'auto',
          height: { xs: height, sm: 'auto' },
          maxHeight: { sm: '90dvh' },
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderBottomLeftRadius: { xs: 0, sm: 24 },
          borderBottomRightRadius: { xs: 0, sm: 24 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      {(title || subtitle) && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography sx={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2, color: brand.muted }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: brand.text }}>{subtitle}</Typography>
            )}
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ '&:hover': { bgcolor: brand.background } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      )}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>{children}</Box>
      {footer && (
        <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {footer}
        </Stack>
      )}
    </Drawer>
  );
}
