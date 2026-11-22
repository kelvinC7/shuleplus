import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatProcurementDate } from './procurementFormat';
import { brand } from '../theme/theme';

const underlineSx = {
  display: 'inline-block',
  minWidth: '7rem',
  borderBottom: '1px solid rgba(0,0,0,0.25)',
  verticalAlign: 'bottom',
  pb: 0.25,
};

/** Three-column approval block - matches PDF / other portal request documents. */
export default function ProcurementApprovalSignatures({
  requestedBy = '',
  reviewer = '',
  approver = '',
  requestDate = '',
}) {
  const cols = [
    { title: 'Requested By', name: requestedBy, date: requestDate },
    { title: 'Reviewed By (Accountant)', name: reviewer, date: '' },
    { title: 'Approved By (Manager)', name: approver, date: '' },
  ];

  return (
    <Box sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.1)', bgcolor: '#fff', p: { xs: 2, sm: 2.5 } }}>
      <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: 'rgba(19,33,61,0.5)', mb: 2 }}>
        Approval
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: { xs: 2.5, sm: 2 } }}>
        {cols.map((col) => (
          <Box key={col.title} sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: brand.navy, borderBottom: '1px solid rgba(0,0,0,0.2)', pb: 1, mb: 1.5, lineHeight: 1.3 }}>
              {col.title}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, fontSize: 11, color: 'rgba(0,0,0,0.6)' }}>
              <Typography component="p" sx={{ fontSize: 11 }}>
                Name:{' '}
                <Box component="span" sx={{ ...underlineSx, color: brand.navy, fontWeight: 500 }}>{col.name || '\u00A0'}</Box>
              </Typography>
              <Typography component="p" sx={{ fontSize: 11 }}>
                Signature:{' '}
                <Box component="span" sx={underlineSx}>{'\u00A0'}</Box>
              </Typography>
              <Typography component="p" sx={{ fontSize: 11 }}>
                Date:{' '}
                <Box component="span" sx={{ ...underlineSx, color: brand.navy }}>{col.date ? formatProcurementDate(col.date) : '\u00A0'}</Box>
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
