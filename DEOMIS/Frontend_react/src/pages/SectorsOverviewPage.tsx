import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { fetchDistrictSectors } from '@/services/deo-api';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

export default function SectorsOverviewPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchDistrictSectors>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDistrictSectors()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <SectionCard title="Sectors in district" subtitle="Monitor every sector — schools, attendance, and reporting gaps">
      {rows.length === 0 ? (
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>No sectors found for your district scope.</Typography>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sector</TableCell>
                <TableCell align="right">Schools</TableCell>
                <TableCell align="right">Students</TableCell>
                <TableCell align="right">Student %</TableCell>
                <TableCell align="right">Staff %</TableCell>
                <TableCell align="right">Not reporting</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.sectorName} hover>
                  <TableCell sx={{ fontWeight: 700 }}>
                    <Link to={`/schools?sector=${encodeURIComponent(r.sectorName)}`} style={{ color: '#000435', textDecoration: 'none' }}>
                      {r.sectorName}
                    </Link>
                  </TableCell>
                  <TableCell align="right">{r.schoolCount}</TableCell>
                  <TableCell align="right">{r.totalStudents.toLocaleString()}</TableCell>
                  <TableCell align="right">{r.studentAttendancePct}%</TableCell>
                  <TableCell align="right">{r.staffAttendancePct}%</TableCell>
                  <TableCell align="right">{r.schoolsNotReporting}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectionCard>
  );
}
