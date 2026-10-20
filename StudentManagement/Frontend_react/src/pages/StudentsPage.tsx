import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, IconButton, Checkbox, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Accordion,
  AccordionSummary, AccordionDetails, ListItemButton, Button, Drawer, Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import { resolveStudentPhotoUrl } from '../utils/resolve-student-photo-url';
import PhoneIcon from '@mui/icons-material/Phone';
import MailIcon from '@mui/icons-material/Mail';
import CakeIcon from '@mui/icons-material/Cake';
import BadgeIcon from '@mui/icons-material/Badge';
import PersonIcon from '@mui/icons-material/Person';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PrintIcon from '@mui/icons-material/Print';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import type { Student, ApiClass, ClassTreeNode } from '@/types';
import StudentImportWizard from '@/components/StudentImportWizard';
import { AcademicYearSelect } from '@/components/academic-year-select';
import { useAcademicYearFilter } from '@/hooks/use-academic-year-filter';
import { getEnrollmentForYear, getClassNameForYear } from '@/utils/enrollment';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';

function buildClassTree(classes: ApiClass[], studentCounts: Map<string, number>): ClassTreeNode[] {
  const grouped = new Map<string, ApiClass[]>();
  for (const cls of classes) {
    const level = cls.category ?? (cls.name.replace(/[0-9].*/, '').trim() || 'Other');
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level)!.push(cls);
  }
  const tree: ClassTreeNode[] = [];
  for (const [level, levelClasses] of grouped) {
    const children: ClassTreeNode[] = levelClasses.map(cls => ({
      name: cls.stream ? `${cls.name} ${cls.stream}` : cls.name,
      count: studentCounts.get(cls.id) ?? 0,
      classId: cls.id,
    }));
    const totalCount = children.reduce((sum, c) => sum + c.count, 0);
    tree.push({ name: level, count: totalCount, children });
  }
  return tree;
}

function TreeItem({ item, depth = 0, activeClassId, onSelectClass }: { item: ClassTreeNode; depth?: number; activeClassId: string | null; onSelectClass: (classId: string | null) => void }) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = !!(item.classId && item.classId === activeClassId);

  if (hasChildren) {
    return (
      <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&::before': { display: 'none' }, boxShadow: 'none' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: '#94a3b8' }} />} sx={{ minHeight: 32, px: 1, py: 0, '& .MuiAccordionSummary-content': { my: 0 }, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: '#64748b', flexShrink: 0, ml: 1 }}>{item.count}</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, py: 0, ml: 1.5, borderLeft: '1px solid', borderColor: '#f1f5f9', pl: 0.75 }}>
          {item.children!.map((child, idx) => <TreeItem key={idx} item={child} depth={depth + 1} activeClassId={activeClassId} onSelectClass={onSelectClass} />)}
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <ListItemButton dense selected={isActive} onClick={() => onSelectClass(item.classId === activeClassId ? null : item.classId!)}
      sx={{ px: 1, py: 0.3, borderRadius: 0.5, minHeight: 32, fontSize: '0.75rem', color: isActive ? '#f59e0b' : '#475569', '&.Mui-selected': { bgcolor: 'rgba(245,158,11,0.05)' }, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Typography sx={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Typography>
        <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: isActive ? '#f59e0b' : '#94a3b8', flexShrink: 0, ml: 1 }}>{item.count}</Typography>
      </Box>
    </ListItemButton>
  );
}

function getParentName(student: Student): string {
  const sp = student.studentParents;
  if (!sp || sp.length === 0) return '—';
  const father = sp.find(p => p.role === 'FATHER');
  const mother = sp.find(p => p.role === 'MOTHER');
  if (father) return `${father.parent.firstName} ${father.parent.lastName}`;
  if (mother) return `${mother.parent.firstName} ${mother.parent.lastName}`;
  return `${sp[0].parent.firstName} ${sp[0].parent.lastName}`;
}

const cellHeaderSx = { fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' };

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
      <Box sx={{ color: '#94a3b8', mt: 0.25, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1e293b', lineHeight: 1.3 }}>{value}</Typography>
      </Box>
    </Box>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>{title}</Typography>
      {children}
    </Box>
  );
}

function formatDate(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const { settings, academicYear, setAcademicYear, years, loading: yearLoading } = useAcademicYearFilter();
  const currentYear = settings?.currentAcademicYear ?? undefined;
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [idPrintStudent, setIdPrintStudent] = useState<Student | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!academicYear) return;
    setLoading(true);
    try {
      const [stuRes, clsRes] = await Promise.all([
        api.get('/students', { params: { academicYear } }),
        api.get('/classes'),
      ]);
      setStudents(stuRes.data.data ?? []);
      setClasses(clsRes.data.data ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const studentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const stu of students) {
      const enrollment = getEnrollmentForYear(stu, academicYear, currentYear);
      if (enrollment) counts.set(enrollment.classId, (counts.get(enrollment.classId) ?? 0) + 1);
    }
    return counts;
  }, [students, academicYear, currentYear]);

  const classTree = useMemo(() => buildClassTree(classes, studentCounts), [classes, studentCounts]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (activeClassId) {
      list = list.filter(s => {
        const enrollment = getEnrollmentForYear(s, academicYear, currentYear);
        return enrollment?.classId === activeClassId;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q) || s.studentUid.toLowerCase().includes(q) || (s.studentCode ?? '').toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [students, activeClassId, search, academicYear, currentYear]);

  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id));
  const isIndeterminate = filteredStudents.some(s => selectedIds.has(s.id)) && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredStudents.map(s => s.id)));
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    const stu = students.find(s => s.id === id);
    if (stu) setProfileStudent(stu);
  };

  const handleClearSelection = () => { setSelectedIds(new Set()); setProfileStudent(null); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => api.delete(`/students/${id}`)));
      setStudents(prev => prev.filter(s => !selectedIds.has(s.id)));
      handleClearSelection();
      setDeleteOpen(false);
    } catch {} finally {
      setDeleting(false);
    }
  };

  const handleStatus = async (status: 'TRANSFERRED' | 'WITHDRAWN') => {
    const label = status === 'TRANSFERRED' ? 'transfer' : 'withdraw';
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${selectedIds.size} student(s)? They will leave the active roll.`)) return;
    try {
      await Promise.all([...selectedIds].map((id) => api.put(`/students/${id}`, { status })));
      setStudents((prev) => prev.map((s) => (selectedIds.has(s.id) ? { ...s, status } : s)));
      handleClearSelection();
    } catch {}
  };

  const handlePrintIds = () => {
    const selected = students.filter((s) => selectedIds.has(s.id));
    if (selected.length === 1) {
      setIdPrintStudent(selected[0]);
      window.setTimeout(() => window.print(), 200);
      return;
    }
    setIdPrintStudent(selected[0] ?? null);
    window.setTimeout(() => window.print(), 200);
  };

  const selectedCount = selectedIds.size;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ display: { md: 'none' } }} onClick={() => setSidebarOpen(true)}><FilterListIcon sx={{ fontSize: 18 }} /></IconButton>
          <Box component={Link} to="/students/new" sx={{ bgcolor: 'primary.main', color: 'white', px: { xs: 1.5, md: 2 }, py: 0.75, borderRadius: 1, fontSize: { xs: '0.75rem', md: '0.875rem' }, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', '&:hover': { opacity: 0.9 } }}>Add New Student</Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
            onClick={() => setImportOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', borderColor: '#cbd5e1', color: '#0f172a', display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Import Students
          </Button>
          <Typography sx={{ fontSize: { xs: '0.8125rem', md: '1rem' }, fontWeight: 600, color: '#1e293b' }}>Students</Typography>
          <IconButton size="small"><SettingsIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, justifyContent: 'flex-end' }}>
          <AcademicYearSelect
            years={years}
            value={academicYear}
            onChange={setAcademicYear}
            disabled={yearLoading}
          />
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment>, sx: { fontSize: '0.875rem', bgcolor: 'white', '& fieldset': { borderColor: '#cbd5e1' } } } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 }, maxWidth: { xs: 180, md: 280 }, width: '100%' }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap' }}>{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</Typography>
        </Box>
      </Box>

      {/* Selection Action Bar */}
      {selectedCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 0.75, bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{selectedCount} selected</Typography>
            <IconButton size="small" onClick={handleClearSelection} sx={{ color: 'white' }}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<EditIcon sx={{ fontSize: 14 }} />} disabled={selectedCount !== 1} onClick={() => navigate(`/students/${[...selectedIds][0]}/edit`)}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.15)' } }} variant="outlined">Edit</Button>
            <Button size="small" disabled={selectedCount !== 1} onClick={() => navigate(`/students/${[...selectedIds][0]}`)}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.15)' } }} variant="outlined">View</Button>
            <Button size="small" startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />} onClick={() => void handleStatus('TRANSFERRED')}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined">Transfer</Button>
            <Button size="small" startIcon={<LogoutIcon sx={{ fontSize: 14 }} />} onClick={() => void handleStatus('WITHDRAWN')}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined">Withdraw</Button>
            <Button size="small" startIcon={<PrintIcon sx={{ fontSize: 14 }} />} onClick={handlePrintIds}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined">ID / QR</Button>
            <Button size="small" startIcon={<DeleteOutlinedIcon sx={{ fontSize: 14 }} />} onClick={() => setDeleteOpen(true)}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined">Delete</Button>
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        <Box sx={{ width: 224, borderRight: '1px solid', borderColor: 'divider', p: 1.5, overflow: 'auto', display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>CLASSES</Typography>
          <Box onClick={() => setActiveClassId(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: activeClassId === null ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: activeClassId === null ? '#f59e0b' : '#1e293b' }}>All Classes</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: activeClassId === null ? '#f59e0b' : '#64748b' }}>{students.length}</Typography>
          </Box>
          {classTree.map((level, idx) => <TreeItem key={idx} item={level} activeClassId={activeClassId} onSelectClass={setActiveClassId} />)}
        </Box>

        {/* Mobile Sidebar Drawer */}
        <Drawer anchor="left" open={sidebarOpen} onClose={() => setSidebarOpen(false)} slotProps={{ paper: { sx: { width: 264, p: 1.5 } } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classes</Typography>
            <IconButton size="small" onClick={() => setSidebarOpen(false)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
          <SidebarContent students={students} classTree={classTree} activeClassId={activeClassId} onSelectClass={(id) => { setActiveClassId(id); setSidebarOpen(false); }} />
        </Drawer>

        {/* Main Table */}
        <TableContainer component={Paper} sx={{ flex: 1, boxShadow: 'none', borderRadius: 0, minWidth: 0 }}>
          {(loading || yearLoading) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}><CircularProgress size={24} /></Box>
          ) : (
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={cellHeaderSx}><Checkbox size="small" checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleToggleAll} /></TableCell>
                  <TableCell sx={cellHeaderSx}>Name</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', sm: 'table-cell' } }}>Gender</TableCell>
                  <TableCell sx={cellHeaderSx}>Class</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', md: 'table-cell' } }}>Parent/Guardian</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', lg: 'table-cell' } }}>Student Code</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', xl: 'table-cell' } }}>Digital ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}><Typography variant="body2" color="text.secondary">No students found</Typography></TableCell></TableRow>
                ) : (
                  filteredStudents.map((stu, index) => {
                    const isSelected = selectedIds.has(stu.id);
                    return (
                      <TableRow key={stu.id} hover selected={isSelected}
                        sx={{ cursor: 'pointer', bgcolor: isSelected ? 'rgba(25,118,210,0.04)' : index % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white', '&:hover': { bgcolor: isSelected ? 'rgba(25,118,210,0.08)' : 'rgba(0,31,63,0.04)' } }}
                        onClick={() => handleToggleRow(stu.id)}>
                        <TableCell padding="checkbox" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Checkbox size="small" checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={() => handleToggleRow(stu.id)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: stu.studentPhoto ? 'transparent' : 'rgba(0,31,63,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                              {stu.studentPhoto ? <img src={resolveStudentPhotoUrl(stu.studentPhoto) ?? ''} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <PersonIcon sx={{ fontSize: 16, color: '#94a3b8' }} />}
                            </Box>
                            <Box>
                              <Typography
                                component={Link}
                                to={`/students/${stu.id}`}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2, color: '#000435', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                              >
                                {stu.firstName} {stu.lastName}
                              </Typography>
                              <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{stu.studentUid}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'table-cell' } }}>{stu.gender ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider' }}>{getClassNameForYear(stu, academicYear, currentYear)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'table-cell' } }}>{getParentName(stu)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', lg: 'table-cell' } }}>{stu.studentCode || stu.studentUid}</TableCell>
                        <TableCell sx={{ fontSize: '0.6875rem', fontWeight: 500, color: stu.rfidUid ? '#047857' : '#94a3b8', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', xl: 'table-cell' }, fontFamily: 'monospace' }}>{stu.rfidUid ?? '—'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        {/* Profile Panel */}
        <Collapse in={!!profileStudent} orientation="horizontal" timeout={250} slotProps={{ root: { sx: { height: '100%', flexShrink: 0 } } }}>
          <Box sx={{ width: { md: 300 }, height: '100%', borderLeft: '1px solid', borderColor: 'divider', overflow: 'auto', flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'white' }}>
            {profileStudent && (<>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b' }}>Profile</Typography>
              <IconButton size="small" onClick={() => setProfileStudent(null)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
            </Box>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: profileStudent.studentPhoto ? 'transparent' : 'rgba(0,31,63,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', mb: 1.5 }}>
                {profileStudent.studentPhoto ? <img src={resolveStudentPhotoUrl(profileStudent.studentPhoto) ?? ''} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} /> : <PersonIcon sx={{ fontSize: 32, color: '#94a3b8' }} />}
              </Box>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{profileStudent.firstName} {profileStudent.lastName}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.25 }}>{profileStudent.studentUid}</Typography>
            </Box>
            <Box sx={{ px: 2, py: 1 }}>
              <ProfileSection title="Personal Information">
                <ProfileRow icon={<BadgeIcon sx={{ fontSize: 16 }} />} label="Student Code" value={profileStudent.studentCode} />
                <ProfileRow icon={<PersonIcon sx={{ fontSize: 16 }} />} label="Gender" value={profileStudent.gender} />
                <ProfileRow icon={<CakeIcon sx={{ fontSize: 16 }} />} label="Date of Birth" value={formatDate(profileStudent.dateOfBirth)} />
                <ProfileRow icon={<HomeIcon sx={{ fontSize: 16 }} />} label="Address" value={[profileStudent.district, profileStudent.sector, profileStudent.cell, profileStudent.village].filter(Boolean).join(', ') || null} />
              </ProfileSection>
              <ProfileSection title="Contact">
                <ProfileRow icon={<PhoneIcon sx={{ fontSize: 16 }} />} label="Phone" value={null} />
                <ProfileRow icon={<MailIcon sx={{ fontSize: 16 }} />} label="Email" value={null} />
              </ProfileSection>
              <ProfileSection title="Academic">
                <ProfileRow icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="Class" value={getClassNameForYear(profileStudent, academicYear, currentYear)} />
                <ProfileRow icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="Enrolled" value={(() => {
                  const enrollment = getEnrollmentForYear(profileStudent, academicYear, currentYear);
                  return enrollment?.joiningDate ? formatDate(enrollment.joiningDate) : null;
                })()} />
              </ProfileSection>
              {profileStudent.studentParents && profileStudent.studentParents.length > 0 && (
                <ProfileSection title="Parent/Guardian">
                  {profileStudent.studentParents.map((sp) => (
                    <ProfileRow key={sp.id} icon={<PersonIcon sx={{ fontSize: 16 }} />} label={sp.role} value={`${sp.parent.firstName} ${sp.parent.lastName}${sp.parent.phone ? ` — ${sp.parent.phone}` : ''}`} />
                  ))}
                </ProfileSection>
              )}
            </Box>
            </>)}
          </Box>
        </Collapse>
      </Box>

      <ConfirmDeleteDialog
        open={deleteOpen}
        title={selectedCount === 1 ? 'Delete this student?' : `Delete ${selectedCount} students?`}
        description={
          selectedCount === 1
            ? 'This student will be permanently removed from the school roll.'
            : 'These students will be permanently removed from the school roll.'
        }
        warning="This cannot be undone."
        confirmLabel={selectedCount === 1 ? 'Delete student' : `Delete ${selectedCount} students`}
        deleting={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />

      <StudentImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          void fetchData();
        }}
      />

      {idPrintStudent && (
        <Box
          className="student-id-print"
          sx={{
            display: 'none',
            '@media print': { display: 'flex', position: 'fixed', inset: 0, bgcolor: 'white', zIndex: 9999, p: 4, flexWrap: 'wrap', gap: 2, alignContent: 'flex-start' },
          }}
        >
          {(selectedIds.size ? students.filter((s) => selectedIds.has(s.id)) : [idPrintStudent]).map((stu) => (
            <Box key={stu.id} sx={{ width: 280, border: '2px solid #000435', borderRadius: 2, p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', color: '#000435' }}>STUDENT ID</Typography>
              <Box sx={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', mx: 'auto', my: 1, bgcolor: '#f1f5f9' }}>
                {stu.studentPhoto ? <img src={resolveStudentPhotoUrl(stu.studentPhoto) ?? ''} alt="" style={{ width: 72, height: 72, objectFit: 'cover' }} /> : null}
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>{stu.firstName} {stu.lastName}</Typography>
              <Typography sx={{ fontSize: '0.75rem' }}>{getClassNameForYear(stu, academicYear, currentYear)}</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', mt: 1 }}>{stu.studentCode || stu.studentUid}</Typography>
              <Typography sx={{ fontSize: '0.65rem', mt: 1, wordBreak: 'break-all' }}>QR: {stu.studentUid}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function SidebarContent({ students, classTree, activeClassId, onSelectClass }: {
  students: Student[]; classTree: ClassTreeNode[]; activeClassId: string | null;
  onSelectClass?: (id: string | null) => void; setActiveClassId?: (id: string | null) => void;
}) {
  const onSelect = onSelectClass ?? (() => {});
  return (
    <Box>
      <Box onClick={() => onSelect(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: activeClassId === null ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: activeClassId === null ? '#f59e0b' : '#1e293b' }}>All Classes</Typography>
        <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: activeClassId === null ? '#f59e0b' : '#64748b' }}>{students.length}</Typography>
      </Box>
      {classTree.map((level, idx) => <TreeItem key={idx} item={level} activeClassId={activeClassId} onSelectClass={onSelect} />)}
    </Box>
  );
}
