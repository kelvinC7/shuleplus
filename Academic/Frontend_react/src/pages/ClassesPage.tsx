import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, IconButton, Checkbox, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Drawer,
  Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import ClassIcon from '@mui/icons-material/Class';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import BookIcon from '@mui/icons-material/Book';
import { smListClasses, smListStudents } from '@/services/api';
import type { ApiClass, ClassTreeNode, Student } from '@/types';
import { mapSmClass, mapSmStudent } from '@/lib/sm-records';
import { toast } from '@/lib/toast';

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

function SectionTitle({ children, sx }: { children: React.ReactNode; sx?: any }) {
  return (
    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider', ...sx }}>
      {children}
    </Typography>
  );
}

function classDisplayName(cls: ApiClass): string {
  const parts = [cls.name];
  if (cls.stream) parts.push(cls.stream);
  return parts.join(' ');
}

const cellHeaderSx = { fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' };

export default function ClassesPage() {
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileClass, setProfileClass] = useState<ApiClass | null>(null);
  const [profileStudents, setProfileStudents] = useState<{ studentId: string; student: Student }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [smClasses, smStudents] = await Promise.all([
        smListClasses().catch(() => []),
        smListStudents({ status: 'ACTIVE' }).catch(() => []),
      ]);
      const mappedClasses = (Array.isArray(smClasses) ? smClasses : []).map(mapSmClass);
      setClasses(mappedClasses);
      setStudents((Array.isArray(smStudents) ? smStudents : []).map((s) => mapSmStudent(s, mappedClasses)));
    } catch {
      toast.error('Failed to load classes from Student Management');
    } finally {
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

  const filteredClasses = useMemo(() => {
    let list = classes;
    if (activeCategory) {
      list = list.filter(c => {
        const cat = c.category ?? (c.name.replace(/[0-9].*/, '').trim() || 'Other');
        return cat === activeCategory;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.stream ?? '').toLowerCase().includes(q) ||
        (c.combination?.name ?? '').toLowerCase().includes(q) ||
        classDisplayName(c).toLowerCase().includes(q)
      );
    }
    return list;
  }, [classes, activeCategory, search]);

  const isAllSelected = filteredClasses.length > 0 && filteredClasses.every(c => selectedIds.has(c.id));
  const isIndeterminate = filteredClasses.some(c => selectedIds.has(c.id)) && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredClasses.map(c => c.id)));
  };

  const openClassProfile = (id: string) => {
    const cls = classes.find(c => c.id === id);
    if (!cls) return;
    setProfileClass(cls);
    const roster = students.filter(s => s.enrollments.some(e => e.isCurrent && e.classId === id));
    setProfileStudents(roster.map(s => ({ studentId: s.id, student: s })));
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    openClassProfile(id);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setProfileClass(null);
    setProfileStudents([]);
  };

  const selectedCount = selectedIds.size;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ display: { md: 'none' } }} onClick={() => setSidebarOpen(true)}><FilterListIcon sx={{ fontSize: 18 }} /></IconButton>
          <Typography sx={{ fontSize: { xs: '0.8125rem', md: '1rem' }, fontWeight: 600, color: '#1e293b' }}>Classes</Typography>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', bgcolor: '#f1f5f9', px: 1, py: 0.4, borderRadius: 1, display: { xs: 'none', sm: 'block' } }}>Student Management</Typography>
          <IconButton size="small"><SettingsIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, justifyContent: 'flex-end' }}>
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment>, sx: { fontSize: '0.875rem', bgcolor: 'white', '& fieldset': { borderColor: '#cbd5e1' } } } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 }, maxWidth: { xs: 180, md: 280 }, width: '100%' }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap' }}>{filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''}</Typography>
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
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>CATEGORIES</Typography>
          <Box onClick={() => setActiveCategory(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: activeCategory === null ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: activeCategory === null ? '#f59e0b' : '#1e293b' }}>All Classes</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: activeCategory === null ? '#f59e0b' : '#64748b' }}>{classes.length}</Typography>
          </Box>
          {classTree.map((level, idx) => {
            const isActive = activeCategory === level.name;
            return (
              <Box key={idx}>
                <Box onClick={() => setActiveCategory(isActive ? null : level.name)}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.4, borderRadius: 0.5, cursor: 'pointer', bgcolor: isActive ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#f59e0b' : '#475569' }}>{level.name}</Typography>
                  <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: isActive ? '#f59e0b' : '#94a3b8' }}>{level.count}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Mobile Sidebar Drawer */}
        <Drawer anchor="left" open={sidebarOpen} onClose={() => setSidebarOpen(false)} slotProps={{ paper: { sx: { width: 264, p: 1.5 } } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categories</Typography>
            <IconButton size="small" onClick={() => setSidebarOpen(false)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
          <Box onClick={() => { setActiveCategory(null); setSidebarOpen(false); }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: activeCategory === null ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: activeCategory === null ? '#f59e0b' : '#1e293b' }}>All Classes</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: activeCategory === null ? '#f59e0b' : '#64748b' }}>{classes.length}</Typography>
          </Box>
          {classTree.map((level, idx) => {
            const isActive = activeCategory === level.name;
            return (
              <Box key={idx} onClick={() => { setActiveCategory(isActive ? null : level.name); setSidebarOpen(false); }}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: isActive ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.25 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#f59e0b' : '#475569' }}>{level.name}</Typography>
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: isActive ? '#f59e0b' : '#94a3b8' }}>{level.count}</Typography>
              </Box>
            );
          })}
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
                  <TableCell sx={cellHeaderSx}>Class</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', sm: 'table-cell' } }}>Combination</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', md: 'table-cell' } }}>Category</TableCell>
                  <TableCell sx={cellHeaderSx}>Students</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}><Typography variant="body2" color="text.secondary">No classes found</Typography></TableCell></TableRow>
                ) : (
                  filteredClasses.map((cls, index) => {
                    const isSelected = selectedIds.has(cls.id);
                    const count = studentCounts.get(cls.id) ?? 0;
                    return (
                      <TableRow key={cls.id} hover selected={isSelected}
                        sx={{ cursor: 'pointer', bgcolor: isSelected ? 'rgba(25,118,210,0.04)' : index % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white', '&:hover': { bgcolor: isSelected ? 'rgba(25,118,210,0.08)' : 'rgba(0,31,63,0.04)' } }}
                        onClick={() => handleToggleRow(cls.id)}>
                        <TableCell padding="checkbox" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Checkbox size="small" checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={() => handleToggleRow(cls.id)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'rgba(25,118,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <ClassIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                            </Box>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>{classDisplayName(cls)}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'table-cell' } }}>{cls.combination?.name ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'table-cell' } }}>{cls.category ?? '—'}</TableCell>
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24, borderRadius: 1, bgcolor: count > 0 ? 'rgba(25,118,210,0.08)' : 'rgba(0,0,0,0.04)', px: 0.75 }}>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: count > 0 ? '#1976d2' : '#94a3b8' }}>{count}</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        {/* Profile Panel */}
        <Collapse in={!!profileClass} orientation="horizontal" timeout={250} slotProps={{ root: { sx: { height: '100%', flexShrink: 0 } } }}>
          <Box sx={{ width: { md: 300 }, height: '100%', borderLeft: '1px solid', borderColor: 'divider', overflow: 'auto', flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'white' }}>
            {profileClass && (<>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b' }}>Class Details</Typography>
                <IconButton size="small" onClick={() => setProfileClass(null)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
              </Box>
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 1, bgcolor: 'rgba(25,118,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                  <ClassIcon sx={{ fontSize: 28, color: '#1976d2' }} />
                </Box>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{classDisplayName(profileClass)}</Typography>
              </Box>
              <Box sx={{ px: 2, py: 1 }}>
                <SectionTitle>Information</SectionTitle>
                <ProfileRow icon={<ClassIcon sx={{ fontSize: 16 }} />} label="Grade" value={profileClass.grade?.name ?? profileClass.name} />
                <ProfileRow icon={<ClassIcon sx={{ fontSize: 16 }} />} label="Stream" value={profileClass.stream} />
                <ProfileRow icon={<CategoryIcon sx={{ fontSize: 16 }} />} label="Category" value={profileClass.grade?.category ?? profileClass.category} />
                <ProfileRow icon={<BookIcon sx={{ fontSize: 16 }} />} label="Combination" value={profileClass.combination?.displayName ?? profileClass.combination?.name} />
                <SectionTitle sx={{ mt: 2 }}>Students</SectionTitle>
                {profileStudents.length === 0 ? (
                  <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8' }}>No students enrolled</Typography>
                ) : (
                  <Box sx={{ maxHeight: 240, overflow: 'auto' }}>
                    {profileStudents.map((e: any) => (
                      <Box key={e.studentId} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <PeopleIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{e.student.firstName} {e.student.lastName}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </>)}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
