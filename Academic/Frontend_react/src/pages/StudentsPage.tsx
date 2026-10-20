import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, IconButton, Checkbox, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Accordion,
  AccordionSummary, AccordionDetails, ListItemButton, Drawer, Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import MailIcon from '@mui/icons-material/Mail';
import CakeIcon from '@mui/icons-material/Cake';
import BadgeIcon from '@mui/icons-material/Badge';
import HomeIcon from '@mui/icons-material/Home';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { smListClasses, smListStudents } from '@/services/api';
import type { Student, ApiClass, ClassTreeNode } from '@/types';
import { mapSmClass, mapSmStudent } from '@/lib/sm-records';

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

function getCurrentClassName(student: Student): string {
  const current = student.enrollments.find(e => e.isCurrent);
  if (!current?.class) return '—';
  return current.class.stream ? `${current.class.name} ${current.class.stream}` : current.class.name;
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
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [smStudents, smClasses] = await Promise.all([
        smListStudents({ status: 'ACTIVE' }).catch(() => []),
        smListClasses().catch(() => []),
      ]);
      const mappedClasses = (Array.isArray(smClasses) ? smClasses : []).map(mapSmClass);
      setClasses(mappedClasses);
      setStudents((Array.isArray(smStudents) ? smStudents : []).map((s) => mapSmStudent(s, mappedClasses)));
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const studentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const stu of students) {
      const current = stu.enrollments.find(e => e.isCurrent);
      if (current) counts.set(current.classId, (counts.get(current.classId) ?? 0) + 1);
    }
    return counts;
  }, [students]);

  const classTree = useMemo(() => buildClassTree(classes, studentCounts), [classes, studentCounts]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (activeClassId) list = list.filter(s => s.enrollments.some(e => e.isCurrent && e.classId === activeClassId));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q) || s.studentUid.toLowerCase().includes(q) || (s.studentCode ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [students, activeClassId, search]);

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

  const selectedCount = selectedIds.size;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ display: { md: 'none' } }} onClick={() => setSidebarOpen(true)}><FilterListIcon sx={{ fontSize: 18 }} /></IconButton>
          <Typography sx={{ fontSize: { xs: '0.8125rem', md: '1rem' }, fontWeight: 600, color: '#1e293b' }}>Students</Typography>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: 1, display: { xs: 'none', sm: 'block' } }}>Student Management</Typography>
          <IconButton size="small"><SettingsIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, justifyContent: 'flex-end' }}>
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
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.85 }}>View only — records live in Student Management</Typography>
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
          {loading ? (
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
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}><Typography variant="body2" color="text.secondary">No students found</Typography></TableCell></TableRow>
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
                              {stu.studentPhoto ? <img src={stu.studentPhoto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <PersonIcon sx={{ fontSize: 16, color: '#94a3b8' }} />}
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>{stu.firstName} {stu.lastName}</Typography>
                              <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{stu.studentUid}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'table-cell' } }}>{stu.gender ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider' }}>{getCurrentClassName(stu)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'table-cell' } }}>{getParentName(stu)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', lg: 'table-cell' } }}>{stu.studentCode || stu.studentUid}</TableCell>
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
                {profileStudent.studentPhoto ? <img src={profileStudent.studentPhoto} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} /> : <PersonIcon sx={{ fontSize: 32, color: '#94a3b8' }} />}
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
                <ProfileRow icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="Class" value={getCurrentClassName(profileStudent)} />
                <ProfileRow icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="Enrolled" value={profileStudent.enrollments?.[0]?.joiningDate ? formatDate(profileStudent.enrollments[0].joiningDate) : null} />
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
