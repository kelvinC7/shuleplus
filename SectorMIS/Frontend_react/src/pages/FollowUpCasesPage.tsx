import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { createFollowUpCase, fetchFollowUpCases, fetchSchools, updateFollowUpCase } from '@/services/sei-api';
import type { FollowUpCase, SchoolRecord } from '@/types';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

export default function FollowUpCasesPage() {
  const [cases, setCases] = useState<FollowUpCase[]>([]);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState('');
  const [issue, setIssue] = useState('High absenteeism');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [c, s] = await Promise.all([fetchFollowUpCases(), fetchSchools()]);
    setCases(c);
    setSchools(s);
    if (!schoolId && s[0]) setSchoolId(s[0].id);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    const school = schools.find((s) => s.id === schoolId);
    if (!school) return;
    setSaving(true);
    try {
      await createFollowUpCase({ schoolId: school.id, schoolName: school.name, issue, priority });
      await reload();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <SectionCard title="Create follow-up case" subtitle="Open → Under Review → Action Required → Resolved → Closed">
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <TextField select label="School" size="small" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            {schools.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Priority" size="small" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Issue" size="small" value={issue} onChange={(e) => setIssue(e.target.value)} sx={{ gridColumn: { md: '1 / -1' } }} />
        </Box>
        <Button variant="contained" sx={{ mt: 2 }} disabled={saving} onClick={handleCreate}>
          Create case
        </Button>
      </SectionCard>

      <SectionCard title="SEI follow-up cases">
        {cases.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>No cases yet.</Typography>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Case</TableCell>
                  <TableCell>School</TableCell>
                  <TableCell>Issue</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Update</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Assigned</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell sx={{ fontWeight: 700 }}>{c.caseNumber}</TableCell>
                    <TableCell>{c.schoolName}</TableCell>
                    <TableCell>{c.issue}</TableCell>
                    <TableCell>{c.priority}</TableCell>
                    <TableCell>{c.status.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={c.status}
                        onChange={async (e) => {
                          await updateFollowUpCase(c.id, {
                            status: e.target.value as FollowUpCase['status'],
                          });
                          await reload();
                        }}
                        sx={{ minWidth: 140 }}
                      >
                        {(['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'CLOSED'] as const).map((s) => (
                          <MenuItem key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{c.assignedTo ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>
    </Box>
  );
}
