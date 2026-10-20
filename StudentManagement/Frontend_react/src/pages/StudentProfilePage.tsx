import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import PersonIcon from '@mui/icons-material/Person';
import { api } from '@/services/api';
import type { Student } from '@/types';
import { getClassNameForYear } from '@/utils/enrollment';
import { resolveStudentPhotoUrl } from '@/utils/resolve-student-photo-url';

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/students/${id}`)
      .then((res) => setStudent(res.data.data))
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={24} /></Box>;
  }
  if (!student) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Student not found.</Typography>
        <Button component={Link} to="/students" startIcon={<ArrowBackIcon />} sx={{ mt: 2, textTransform: 'none' }}>Back to list</Button>
      </Box>
    );
  }

  const current = student.enrollments?.find((e) => e.isCurrent);
  const className = getClassNameForYear(student, current?.academicYear ?? '', current?.academicYear);

  return (
    <Box sx={{ height: '100%', overflow: 'auto', bgcolor: 'white', p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Button component={Link} to="/students" startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none' }}>Students</Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ textTransform: 'none', fontWeight: 700 }}>Print</Button>
          <Button component={Link} to={`/students/${student.id}/edit`} variant="contained" startIcon={<EditIcon />} sx={{ textTransform: 'none', fontWeight: 700 }}>Edit</Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, mb: 3, alignItems: 'center' }}>
        <Box sx={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {student.studentPhoto
            ? <img src={resolveStudentPhotoUrl(student.studentPhoto) ?? ''} alt="" style={{ width: 88, height: 88, objectFit: 'cover' }} />
            : <PersonIcon sx={{ fontSize: 40, color: '#94a3b8' }} />}
        </Box>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 800 }}>{student.firstName} {student.lastName}</Typography>
          <Typography sx={{ color: '#64748b' }}>{student.studentCode || student.studentUid} · {className}</Typography>
          <Chip size="small" label={student.status} sx={{ mt: 1, fontWeight: 700 }} />
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Section title="Identity">
          <Row label="ShuleCode" value={student.studentUid} />
          <Row label="Family name" value={student.lastName} />
          <Row label="Student code" value={student.studentCode} />
          <Row label="SDM" value={student.sdmCode} />
          <Row label="RFID / Digital ID" value={student.rfidUid} />
          <Row label="Gender" value={student.gender} />
          <Row label="Date of birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB') : null} />
          <Row label="Nationality" value={student.nationality} />
        </Section>
        <Section title="Residence">
          <Row label="District" value={student.district} />
          <Row label="Sector" value={student.sector} />
          <Row label="Cell" value={student.cell} />
          <Row label="Village" value={student.village} />
        </Section>
        <Section title="Academic">
          <Row label="Class" value={className} />
          <Row label="Enrolled" value={current?.joiningDate ? new Date(current.joiningDate).toLocaleDateString('en-GB') : null} />
          <Row label="Former school" value={student.formerSchool} />
        </Section>
        <Section title="Medical">
          <Row label="Blood group" value={student.bloodGroup} />
          <Row label="Allergies" value={student.allergies} />
        </Section>
        <Section title="Notes & documents">
          <Row label="Identity remarks" value={student.identityRemarks} />
          <Row label="Leaving reason" value={student.leavingReason} />
          <Row label="Photo on file" value={student.studentPhoto ? 'Yes' : 'No'} />
        </Section>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Section title="Parents / guardians">
          {(student.studentParents ?? []).length === 0 ? (
            <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8' }}>No guardians on file</Typography>
          ) : (
            student.studentParents.map((sp) => (
              <Row
                key={sp.id}
                label={sp.role}
                value={`${sp.parent.firstName} ${sp.parent.lastName}${sp.parent.phone ? ` · ${sp.parent.phone}` : ''}${sp.parent.email ? ` · ${sp.parent.email}` : ''}`}
              />
            ))
          )}
        </Section>
      </Box>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1.5 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.5, borderBottom: '1px solid #f1f5f9' }}>
      <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, textAlign: 'right' }}>{value || '—'}</Typography>
    </Box>
  );
}
