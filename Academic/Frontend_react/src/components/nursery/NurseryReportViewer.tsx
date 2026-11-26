import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import PublishIcon from '@mui/icons-material/Publish';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import NurseryReportCard from '@/components/nursery/NurseryReportCard';
import { downloadReportPdf, printReportPdf } from '@/lib/downloadReportPdf';
import { toast } from '@/lib/toast';
import type { NurseryReport } from '@/types/nursery';

type Props = {
  open: boolean;
  report: NurseryReport | null;
  onClose: () => void;
  onPublish?: () => void;
  publishing?: boolean;
  onEditComments?: () => void;
};

export default function NurseryReportViewer({
  open,
  report,
  onClose,
  onPublish,
  publishing,
  onEditComments,
}: Props) {
  const docRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleDownload = useCallback(async () => {
    if (!docRef.current || !report) return;
    setBusy(true);
    try {
      const name = report.studentName?.replace(/\s+/g, '_') || 'student';
      const stage =
        report.reportKind === 'beginning' ? 'beginning' : report.reportKind === 'midterm' ? 'mid-term' : 'term-1';
      await downloadReportPdf(docRef.current, `nursery-report-${name}-${stage}-${report.term}.pdf`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download the report');
    } finally {
      setBusy(false);
    }
  }, [report]);

  const handlePrint = useCallback(async () => {
    if (!docRef.current) return;
    setBusy(true);
    try {
      await printReportPdf(docRef.current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not print the report');
    } finally {
      setBusy(false);
    }
  }, []);

  if (!open || !report) return null;
  const snapshot = report.snapshot;
  const published = report.status === 'PUBLISHED';

  return (
    <Box
      className="report-viewer-modal no-print-backdrop"
      sx={{ position: 'fixed', inset: 0, zIndex: 1500, bgcolor: '#1f2937', display: 'flex', flexDirection: 'column' }}
    >
      <Box
        className="no-print"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: { xs: 1, sm: 2 },
          py: 1,
          bgcolor: '#111827',
          color: '#fff',
          flexShrink: 0,
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Button startIcon={<ArrowBackIcon />} onClick={onClose} sx={{ color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: '0.8125rem' }}>
          Back to reports
        </Button>
        <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, minWidth: 140 }} noWrap>
          {report.studentName} ·{' '}
          {report.reportKind === 'beginning' ? 'Beginning' : report.reportKind === 'midterm' ? 'Mid-term' : 'Term 1'}{' '}
          · {report.term} {report.academicYear}
        </Typography>
        <Button
          size="small"
          startIcon={<DownloadIcon />}
          disabled={busy}
          onClick={() => void handleDownload()}
          sx={{ color: '#fff', textTransform: 'none', fontWeight: 600 }}
        >
          PDF
        </Button>
        <Button
          size="small"
          startIcon={<PrintIcon />}
          disabled={busy}
          onClick={() => void handlePrint()}
          sx={{ color: '#fff', textTransform: 'none', fontWeight: 600 }}
        >
          Print
        </Button>
        {onEditComments ? (
          <Button
            size="small"
            startIcon={<EditNoteOutlinedIcon />}
            onClick={onEditComments}
            sx={{ color: '#fff', textTransform: 'none', fontWeight: 600 }}
          >
            Comments
          </Button>
        ) : null}
        <Button
          size="small"
          startIcon={<PublishIcon />}
          disabled={publishing || published || !onPublish}
          onClick={() => onPublish?.()}
          sx={{
            color: '#000435',
            bgcolor: published ? '#64748b' : '#FCB038',
            textTransform: 'none',
            fontWeight: 800,
            '&:hover': { bgcolor: published ? '#64748b' : '#e5a032' },
          }}
        >
          {published ? 'Published' : publishing ? 'Publishing…' : 'Publish'}
        </Button>
        <IconButton size="small" sx={{ color: '#fff' }} onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', py: 3, px: { xs: 0.5, sm: 3 }, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <Box sx={{ width: '100%', maxWidth: 794 }} className="report-card-page">
          <NurseryReportCard report={snapshot} documentRef={docRef} />
        </Box>
      </Box>
    </Box>
  );
}
