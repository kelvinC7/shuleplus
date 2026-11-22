import { useEffect, useMemo, useState } from 'react';
import api, { API_BASE_URL } from '../services/api';
import { jsPDF } from 'jspdf';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Page, PageHeader, Panel, PageLoading, EmptyState, ErrorBanner, KpiGrid, Kpi } from '../components/ui';
import { brand } from '../theme/theme';

const fmtN = (v) => new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const API_ORIGIN = String(API_BASE_URL || '').replace(/\/api\/?$/, '');

const buildPayslipHtml = (record, staff) => {
  const basic = Number(record?.basic || 0);
  const allowances = Number(record?.allowances || 0);
  const deductions = Number(record?.deductions ?? record?.tax ?? 0);
  const rssb = Number(record?.rssb || 0);
  const advance = Number(record?.advance || 0);
  const net = Number(record?.net || 0);
  const paid = Number(record?.paid || 0);
  const gross = basic + allowances;
  const totalDeductions = rssb + deductions + advance;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payslip - ${esc(staff?.staffCode)} - ${esc(record?.month)} ${esc(record?.year)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Montserrat', system-ui, sans-serif; max-width: 680px; margin: 32px auto; color: #0f172a; background: #f8fafc; padding: 0 16px; }
    .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { background: #13213D; padding: 28px 28px 24px; }
    .header h1 { color: white; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
    .header .sub { color: rgba(255,255,255,0.55); font-size: 12px; margin-top: 4px; }
    .period-badge { display: inline-block; background: #f5bf24; color: #13213D; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; margin-top: 12px; letter-spacing: 0.5px; }
    .body { padding: 24px 28px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 24px; }
    .info-row { display: flex; flex-direction: column; }
    .info-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
    .info-value { font-size: 13px; color: #0f172a; font-weight: 600; margin-top: 2px; }
    .divider { border: none; border-top: 1px dashed #e2e8f0; margin: 20px 0; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; margin-bottom: 12px; }
    .green { color: #059669; }
    .red { color: #dc2626; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 8px; margin-bottom: 4px; font-size: 13px; }
    .row:nth-child(odd) { background: #f8fafc; }
    .row.total { background: #13213D; color: white; font-size: 14px; font-weight: 800; border-radius: 10px; margin-top: 8px; padding: 12px 16px; }
    .row.paid { background: #f5bf24; color: #13213D; font-size: 13px; font-weight: 800; border-radius: 10px; margin-top: 6px; padding: 10px 16px; }
    .footer { text-align: center; color: #94a3b8; font-size: 10px; padding: 20px 28px; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Official Payslip</h1>
      <div class="sub">Babyeyi School System · Teacher Portal</div>
      <div class="period-badge">${esc(record?.month || '-')} ${esc(record?.year || '')} ${esc(record?.term || '')}</div>
    </div>
    <div class="body">
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">${esc(staff?.fullName || '-')}</span></div>
        <div class="info-row"><span class="info-label">Staff ID</span><span class="info-value">${esc(staff?.staffCode || '-')}</span></div>
        <div class="info-row"><span class="info-label">Department</span><span class="info-value">${esc(staff?.department || '-')}</span></div>
        <div class="info-row"><span class="info-label">Job Role</span><span class="info-value">${esc(staff?.role || '-')}</span></div>
        <div class="info-row"><span class="info-label">Payment Status</span><span class="info-value">${esc(record?.status || '-')}</span></div>
      </div>
      <hr class="divider" />
      <div class="section-title green">What You Earned</div>
      <div class="row"><span>Base Salary</span><span>${fmtN(basic)} RWF</span></div>
      <div class="row"><span>Allowances</span><span class="green">+ ${fmtN(allowances)} RWF</span></div>
      <div class="row" style="font-weight:700;"><span>Gross Pay</span><span>${fmtN(basic + allowances)} RWF</span></div>
      <hr class="divider" />
      <div class="section-title red">Deductions</div>
      <div class="row"><span>RSSB / Pension</span><span class="red">- ${fmtN(rssb)} RWF</span></div>
      <div class="row"><span>Income Tax</span><span class="red">- ${fmtN(deductions)} RWF</span></div>
      <div class="row"><span>Salary Advance</span><span class="red">- ${fmtN(advance)} RWF</span></div>
      <div class="row" style="font-weight:700;"><span>Total Deductions</span><span class="red">- ${fmtN(rssb + deductions + advance)} RWF</span></div>
      <div class="row total"><span>Your Net Salary</span><span>${fmtN(net)} RWF</span></div>
      <div class="row paid"><span>Amount Deposited</span><span>${fmtN(paid)} RWF</span></div>
    </div>
    <div class="footer">Computer-generated payslip · No signature required · Babyeyi School System</div>
  </div>
</body>
</html>`;
};

const loadLogoPngDataUrl = async () => {
  try {
    const loadImageFromSrc = async (src) => {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(image, 0, 0, 256, 256);
      return canvas.toDataURL('image/png');
    };
    try { return await loadImageFromSrc('/1BABYEYI LOGO FINAL.png'); }
    catch {
      const svgText = await fetch('/favicon.svg').then((r) => r.text());
      const encoded = window.btoa(unescape(encodeURIComponent(svgText)));
      return await loadImageFromSrc(`data:image/svg+xml;base64,${encoded}`);
    }
  } catch { return null; }
};

const toAssetUrl = (rawPath) => {
  const p = String(rawPath || '').trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return `${API_ORIGIN}${p.startsWith('/') ? p : `/${p}`}`;
};

const loadRemoteImagePngDataUrl = async (src) => {
  if (!src) return null;
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 256, 256);
    ctx.drawImage(image, 0, 0, 256, 256);
    return canvas.toDataURL('image/png');
  } catch { return null; }
};

const generatePayslipPdf = async (record, staff, school) => {
  const basic = Number(record?.basic || 0);
  const allowances = Number(record?.allowances || 0);
  const deductions = Number(record?.deductions ?? record?.tax ?? 0);
  const rssb = Number(record?.rssb || 0);
  const advance = Number(record?.advance || 0);
  const net = Number(record?.net || 0);
  const paid = Number(record?.paid || 0);
  const gross = basic + allowances;
  const totalDeductions = rssb + deductions + advance;
  const logo = await loadLogoPngDataUrl();
  const schoolLogo = await loadRemoteImagePngDataUrl(toAssetUrl(school?.logoUrl));
  const schoolStamp = await loadRemoteImagePngDataUrl(toAssetUrl(school?.stampUrl));
  const schoolSignature = await loadRemoteImagePngDataUrl(toAssetUrl(school?.signatureUrl));

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  doc.setFillColor(19, 33, 61);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'F');
 
  if (schoolLogo) doc.addImage(schoolLogo, 'PNG', pageWidth - margin - 24, y + 4, 20, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Official Payslip', margin + 42, y + 11);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Babyeyi School System', margin + 42, y + 17);
  doc.setTextColor(245, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.text(`${record?.month || '-'} ${record?.year || ''} ${record?.term || ''}`, margin + 42, y + 23);
  y += 36;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 2, 2, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Employee Details', margin + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Name: ${staff?.fullName || '-'}`, margin + 3, y + 12);
  doc.text(`Staff ID: ${staff?.staffCode || '-'}`, margin + 3, y + 17);
  doc.text(`Department: ${staff?.department || '-'}`, margin + 3, y + 22);
  doc.text(`Role: ${staff?.role || '-'}`, margin + 3, y + 27);
  doc.text(`Status: ${record?.status || '-'}`, pageWidth / 2 + 15, y + 12);
  doc.text(`Paid On: ${record?.paidDate ? String(record.paidDate).slice(0, 10) : '-'}`, pageWidth / 2 + 15, y + 17);
  doc.text(`Reference: ${record?.payrollId || `PAY-${record?.id || ''}`}`, pageWidth / 2 + 15, y + 22);
  y += 36;

  const drawRow = (label, value, options = {}) => {
    const h = options.highlight ? 8 : 7;
    if (options.highlight) { doc.setFillColor(...options.fill); doc.rect(margin, y, pageWidth - margin * 2, h, 'F'); }
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(options.big ? 11 : 10);
    doc.setTextColor(...(options.color || [30, 41, 59]));
    doc.text(label, margin + 3, y + 5);
    doc.text(value, pageWidth - margin - 3, y + 5, { align: 'right' });
    y += h;
  };

  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 50, 2, 2, 'S');
  drawRow('What You Earned', '', { bold: true, color: [4, 120, 87] });
  drawRow('Base Salary', `${fmtN(basic)} RWF`);
  drawRow('Allowances', `+ ${fmtN(allowances)} RWF`, { color: [4, 120, 87] });
  drawRow('Gross Pay', `${fmtN(gross)} RWF`, { bold: true, highlight: true, fill: [236, 253, 245], color: [4, 120, 87] });
  y += 3;

  doc.roundedRect(margin, y, pageWidth - margin * 2, 58, 2, 2, 'S');
  drawRow('Deductions', '', { bold: true, color: [127, 29, 29] });
  drawRow('RSSB / Pension', `- ${fmtN(rssb)} RWF`, { color: [185, 28, 28] });
  drawRow('Income Tax', `- ${fmtN(deductions)} RWF`, { color: [185, 28, 28] });
  drawRow('Salary Advance', `- ${fmtN(advance)} RWF`, { color: [194, 65, 12] });
  drawRow('Total Deductions', `- ${fmtN(totalDeductions)} RWF`, { bold: true, highlight: true, fill: [254, 242, 242], color: [153, 27, 27] });
  y += 4;

  doc.setFillColor(19, 33, 61);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Your Net Salary', margin + 4, y + 8);
  doc.text(`${fmtN(net)} RWF`, pageWidth - margin - 4, y + 8, { align: 'right' });
  doc.setTextColor(245, 191, 36);
  doc.text('Amount Deposited', margin + 4, y + 16);
  doc.text(`${fmtN(paid)} RWF`, pageWidth - margin - 4, y + 16, { align: 'right' });
  y += 26;

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Submitted by: ${record?.submittedBy || '-'}`, margin, y);
  doc.text(`Approved by: ${record?.approvedBy || '-'}`, margin, y + 5);
  doc.text('Computer-generated official payslip. No signature required.', pageWidth / 2, 286, { align: 'center' });

  const fileCode = staff?.staffCode || 'STAFF';
  doc.save(`payslip-${fileCode}-${record?.month || 'month'}-${record?.year || 'year'}.pdf`);
};

export default function StaffPayroll() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/teacher-portal/staff/payroll/my');
        if (!active) return;
        setData(res.data?.data || null);
      } catch (e) {
        if (active) setError(e?.response?.data?.message || e?.message || 'Unable to load your payroll details');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const history = data?.history || [];
  const paidTotal = useMemo(
    () => history.filter((h) => h.status === 'Paid').reduce((s, h) => s + Number(h.paid || 0), 0),
    [history]
  );
  const staff = data?.staff || {};
  const school = data?.school || {};
  const selectedIsPaid = String(selectedPayroll?.status || '').toLowerCase() === 'paid';

  const handlePrintPayslip = () => {
    if (!selectedPayroll) return;
    const html = buildPayslipHtml(selectedPayroll, staff);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const handleDownloadPayslip = () => {
    if (!selectedPayroll) return;
    generatePayslipPdf(selectedPayroll, staff, school);
  };

  const fmt = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return `${Math.round(v).toLocaleString()} RWF`;
  };

  if (loading) {
    return (
      <Page>
        <PageLoading label="Loading your payroll…" />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <ErrorBanner message={error} onRetry={() => window.location.reload()} />
      </Page>
    );
  }

  return (
    <Page maxWidth={900}>
      <PageHeader
        title="My payroll"
        description={staff?.fullName ? `${staff.fullName}${staff.staffCode ? ` · ${staff.staffCode}` : ''}` : 'Salary history and payslips'}
      />

      <KpiGrid columns={3}>
        <Kpi label="Paid total" value={fmt(paidTotal)} />
        <Kpi label="Records" value={history.length} />
        <Kpi label="Status" value={history[0]?.status || '—'} hint={history[0] ? `${history[0].month || ''} ${history[0].year || ''}` : ''} />
      </KpiGrid>

      <Panel title="Salary history" bodySx={{ p: 0 }}>
        {!history.length ? (
          <EmptyState title="No payroll records" description="Payslips appear here after payroll is processed." />
        ) : (
          <Stack spacing={0}>
            {history.map((row, i) => {
              const selected = selectedPayroll === row || (selectedPayroll && selectedPayroll.id && selectedPayroll.id === row.id);
              return (
                <Box
                  key={row.id || `${row.month}-${row.year}-${i}`}
                  onClick={() => setSelectedPayroll(row)}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: i < history.length - 1 ? `1px solid ${brand.border}` : 'none',
                    bgcolor: selected ? 'rgba(245,166,35,0.08)' : 'transparent',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(19,33,61,0.03)' },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: 14 }}>
                        {row.month || '—'} {row.year || ''}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: brand.muted }}>{row.term || row.status || ''}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 700, color: brand.navy, fontSize: 14 }}>{fmt(row.paid ?? row.netPay)}</Typography>
                      <Typography sx={{ fontSize: 11, color: brand.muted }}>{row.status || '—'}</Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Panel>

      {selectedPayroll ? (
        <Panel
          title="Payslip actions"
          subtitle={`${selectedPayroll.month || ''} ${selectedPayroll.year || ''} · ${selectedPayroll.status || ''}`}
          sx={{ mt: 2 }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="outlined"
              disabled={!selectedIsPaid}
              onClick={handlePrintPayslip}
              sx={{ borderColor: brand.border, fontWeight: 600 }}
            >
              Print
            </Button>
            <Button
              variant="contained"
              color="secondary"
              disabled={!selectedIsPaid}
              onClick={handleDownloadPayslip}
              sx={{ fontWeight: 600 }}
            >
              Download PDF
            </Button>
          </Stack>
          {!selectedIsPaid ? (
            <Typography sx={{ mt: 1.5, fontSize: 13, color: brand.muted }}>
              Payslip downloads are available once payment is confirmed.
            </Typography>
          ) : null}
        </Panel>
      ) : null}
    </Page>
  );
}