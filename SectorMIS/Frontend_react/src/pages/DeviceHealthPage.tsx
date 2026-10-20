import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { fetchDeviceHealth } from '@/services/sei-api';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

type DeviceRow = {
  schoolId: string;
  schoolName: string;
  online: boolean;
  lastSync: string | null;
  internet: boolean;
  batteryPct: number | null;
  readerStatus: string;
  scansToday: number;
  clockStatus: string;
};

export default function DeviceHealthPage() {
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeviceHealth()
      .then((d) => setRows(d as DeviceRow[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <SectionCard title="Attendance device health" subtitle="No attendance data ≠ students absent. Verify device status first.">
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>School</TableCell>
              <TableCell>Online</TableCell>
              <TableCell>Last sync</TableCell>
              <TableCell>Internet</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Battery</TableCell>
              <TableCell>Reader</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Scans</TableCell>
              <TableCell>Clock</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.schoolId}>
                <TableCell sx={{ fontWeight: 600 }}>{r.schoolName}</TableCell>
                <TableCell>{r.online ? 'Yes' : 'No'}</TableCell>
                <TableCell>{r.lastSync ?? '-'}</TableCell>
                <TableCell>{r.internet ? 'OK' : 'Down'}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{r.batteryPct != null ? `${r.batteryPct}%` : '-'}</TableCell>
                <TableCell>{r.readerStatus}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{r.scansToday}</TableCell>
                <TableCell>{r.clockStatus}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  );
}
