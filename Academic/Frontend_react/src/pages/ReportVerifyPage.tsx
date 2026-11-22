import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LoginIcon from '@mui/icons-material/Login';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3003/api';
const IAM_URL = import.meta.env.VITE_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
const PARENT_LOGIN = import.meta.env.VITE_PARENT_PORTAL_URL?.replace(/\/$/, '') ?? 'http://localhost:3049/login';

type VerifyPayload = {
  valid: boolean;
  reportNumber: string;
  schoolName: string | null;
  message: string;
};

export default function ReportVerifyPage() {
  const [params] = useSearchParams();
  const ref = params.get('ref')?.trim() ?? '';
  const org = params.get('org')?.trim() ?? '';

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<VerifyPayload | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (ref) q.set('ref', ref);
    if (org) q.set('org', org);
    return q.toString();
  }, [ref, org]);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      setFailed('Missing report reference. Scan the QR code on the official report card.');
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setFailed(null);
      try {
        const res = await fetch(`${API_BASE}/public/report-card/verify?${query}`, {
          headers: { Accept: 'application/json' },
        });
        const json = (await res.json()) as { data?: VerifyPayload; message?: string };
        if (!res.ok || !json.data?.valid) {
          if (!cancelled) setFailed(json.message || 'This report could not be verified.');
          return;
        }
        if (!cancelled) setPayload(json.data ?? null);
      } catch {
        if (!cancelled) {
          setFailed(
            'Could not reach the verification service. If you scanned from a phone, use Wi‑Fi on the same network as the school server, or ask the school for a public verify link.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ref, query]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)',
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        px: 2,
        py: 6,
      }}
    >
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              mx: 'auto',
              mb: 1.5,
              borderRadius: 2,
              bgcolor: '#000435',
              color: '#FCB038',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VerifiedIcon />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#000435' }}>
            Report verification
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Shule+ · Official school reports
          </Typography>
        </Box>

        <Box sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff', boxShadow: '0 20px 50px -24px rgba(0,4,53,0.2)', p: 3 }}>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Verifying…
            </Typography>
          ) : failed ? (
            <Typography variant="body2" color="error.main">
              {failed}
            </Typography>
          ) : payload ? (
            <>
              <Box sx={{ display: 'flex', gap: 1.5, p: 2, borderRadius: 2, bgcolor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <VerifiedIcon sx={{ color: '#059669', mt: 0.25 }} />
                <Box>
                  <Typography sx={{ fontWeight: 800, color: '#065f46' }}>Verified report</Typography>
                  <Typography variant="body2" sx={{ color: '#047857', mt: 0.5 }}>
                    {payload.message}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 2, fontSize: '0.875rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography color="text.secondary">Reference</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem' }}>
                    {payload.reportNumber}
                  </Typography>
                </Box>
                {payload.schoolName ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                    <Typography color="text.secondary">School</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{payload.schoolName}</Typography>
                  </Box>
                ) : null}
              </Box>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, p: 1.5, borderRadius: 2, bgcolor: '#f8fafc', fontSize: '0.75rem', color: '#64748b' }}>
                <LockOutlinedIcon sx={{ fontSize: 18 }} />
                <span>Marks and personal details are not shown here. Sign in to view the full report.</span>
              </Box>
              <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <Button variant="contained" href={PARENT_LOGIN} startIcon={<LoginIcon />} sx={{ bgcolor: '#000435', textTransform: 'none', fontWeight: 700 }}>
                  Parent login
                </Button>
                <Button variant="outlined" href={IAM_URL} startIcon={<SchoolOutlinedIcon />} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  School portal
                </Button>
              </Box>
            </>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
