import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { SxProps, Theme } from '@mui/material';
import { getMainScrollEl } from '@/shared/main-scroll';

/** MUI Dialog/Drawer scoped to #shulechat-main-scroll so the sidebar stays clickable. */
export function useMainPaneModal(open: boolean, onClose: () => void, fullScreen = false) {
  const { pathname } = useLocation();
  const [mountEl, setMountEl] = useState<HTMLElement | undefined>();
  const prevPath = useRef(pathname);

  useLayoutEffect(() => {
    if (!open) {
      setMountEl(undefined);
      return;
    }
    setMountEl(getMainScrollEl());
  }, [open]);

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    if (open) onClose();
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const scoped = Boolean(mountEl) && !fullScreen;

  const scopedSx: SxProps<Theme> = scoped
    ? {
        position: 'absolute',
        zIndex: 1300,
        '& .MuiBackdrop-root': { position: 'absolute' },
        '& .MuiDrawer-root': { position: 'absolute' },
        '& .MuiModal-root': { position: 'absolute' },
      }
    : { zIndex: 1400 };

  return {
    scoped,
    mountEl,
    disablePortal: scoped,
    container: mountEl,
    scopedSx,
  };
}

export function clearGlobalModalLock() {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.body.classList.remove('MuiModal-hidden');
}
