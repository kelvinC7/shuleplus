import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Box, IconButton, Typography, Slider, Button, Menu, MenuItem, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import PublishIcon from '@mui/icons-material/Publish';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import type { ReportCardDataV2 } from '@/types';
import ModernStudentReportCard from '@/components/ModernStudentReportCard';
import { downloadReportPdf, printReportPdf } from '@/lib/downloadReportPdf';
import { toast } from '@/lib/toast';

type Props = {
  open: boolean;
  report: ReportCardDataV2 | null;
  onClose: () => void;
  title?: string;
  documentRef?: RefObject<HTMLDivElement | null>;
  onBack?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  onPublish?: () => void;
  publishing?: boolean;
  isPublished?: boolean;
  onMore?: (anchor: HTMLElement) => void;
};

export default function ReportCardViewerModal({
  open,
  report,
  onClose,
  title,
  documentRef,
  onBack,
  onDownload,
  onPrint,
  onPublish,
  publishing,
  isPublished,
  onMore,
}: Props) {
  const internalRef = useRef<HTMLDivElement>(null);
  const docRef = documentRef ?? internalRef;
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [localMore, setLocalMore] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handlePrint = useCallback(async () => {
    if (onPrint) {
      onPrint();
      return;
    }
    if (!docRef.current) return;
    setBusy(true);
    try {
      await printReportPdf(docRef.current);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Print failed');
    } finally {
      setBusy(false);
    }
  }, [onPrint, docRef]);

  const handleDownload = useCallback(async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!docRef.current || !report) return;
    setBusy(true);
    try {
      const name = [report.student?.firstName, report.student?.lastName].filter(Boolean).join('_') || 'student';
      await downloadReportPdf(docRef.current, `report-${name}-${report.academicYear}.pdf`);
    } finally {
      setBusy(false);
    }
  }, [onDownload, report, docRef]);

  if (!open || !report) return null;

  const termLine = title || (report.term ? `${report.term} report card` : 'Report card');

  return (
    <Box
      className="report-viewer-modal no-print-backdrop"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        bgcolor: '#2d2d2d',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        className="no-print"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.5, sm: 1 },
          px: { xs: 1, sm: 2 },
          py: 1,
          bgcolor: '#1e1e1e',
          color: '#fff',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexWrap: 'wrap',
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack ?? onClose}
          sx={{ color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: '0.8125rem' }}
        >
          Back to reports
        </Button>
        <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, minWidth: 120 }} noWrap>
          {termLine}
        </Typography>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, minWidth: 160 }}>
          <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setZoom((z) => Math.max(60, z - 10))}>
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Slider
            size="small"
            value={zoom}
            min={60}
            max={140}
            step={5}
            onChange={(_, v) => setZoom(v as number)}
            sx={{ width: 90, color: '#FCB038' }}
          />
          <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setZoom((z) => Math.min(140, z + 10))}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        <Button
          size="small"
          startIcon={<DownloadIcon />}
          disabled={busy}
          onClick={() => void handleDownload()}
          sx={{ color: '#fff', textTransform: 'none', fontWeight: 600, display: { xs: 'none', sm: 'inline-flex' } }}
        >
          PDF
        </Button>
        <Button
          size="small"
          startIcon={<PrintIcon />}
          disabled={busy}
          onClick={() => void handlePrint()}
          sx={{ color: '#fff', textTransform: 'none', fontWeight: 600, display: { xs: 'none', sm: 'inline-flex' } }}
        >
          Print
        </Button>
        <Button
          size="small"
          startIcon={<PublishIcon />}
          disabled={publishing || isPublished}
          onClick={() => onPublish?.()}
          sx={{
            color: '#000435',
            bgcolor: isPublished ? '#64748b' : '#FCB038',
            textTransform: 'none',
            fontWeight: 800,
            '&:hover': { bgcolor: isPublished ? '#64748b' : '#e5a032' },
          }}
        >
          {isPublished ? 'Published' : publishing ? '…' : 'Publish'}
        </Button>
        <IconButton
          size="small"
          sx={{ color: '#fff' }}
          onClick={(e) => (onMore ? onMore(e.currentTarget) : setLocalMore(e.currentTarget))}
        >
          <ShareOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {!onMore ? (
        <Menu anchorEl={localMore} open={Boolean(localMore)} onClose={() => setLocalMore(null)}>
          <MenuItem onClick={() => { setLocalMore(null); void handleDownload(); }}>Download PDF</MenuItem>
          <MenuItem onClick={() => { setLocalMore(null); void handlePrint(); }}>Print</MenuItem>
          <Divider />
          <MenuItem onClick={() => setLocalMore(null)}>Close</MenuItem>
        </Menu>
      ) : null}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 3,
          px: { xs: 0.5, sm: 3 },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <Box
          sx={{
            transform: { xs: 'none', sm: `scale(${zoom / 100})` },
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
            width: '100%',
            maxWidth: 794,
          }}
        >
          <ModernStudentReportCard report={report} documentRef={docRef} />
        </Box>
      </Box>
    </Box>
  );
}
