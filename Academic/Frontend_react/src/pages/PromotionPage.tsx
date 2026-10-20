import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, TextField, IconButton, Checkbox, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Button,
  Autocomplete, Drawer, Accordion, AccordionSummary, AccordionDetails, ListItemButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import { api } from '@/services/api';
import { toast } from '@/lib/toast';
import type { Student, ApiClass, ClassTreeNode } from '@/types';

function getCurrentClassName(student: Student): string {
  const current = student.enrollments.find(e => e.isCurrent);
  if (!current?.class) return '—';
  return current.class.stream ? `${current.class.name} ${current.class.stream}` : current.class.name;
}

function classLabel(c: ApiClass): string {
  const parts = [c.name];
  if (c.combination?.name) parts.push(c.combination.name);
  if (c.stream) parts.push(c.stream);
  return parts.join(' ');
}

const cellHeaderSx = { fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' };

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

export default function PromotionPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sourceClassId, setSourceClassId] = useState<string | null>(null);
  const [targetClassId, setTargetClassId] = useState<string | null>(null);
  const [newAcademicYear, setNewAcademicYear] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promoted, setPromoted] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, clsRes] = await Promise.all([
        api.get('/students'),
        api.get('/classes'),
      ]);
      setStudents(stuRes.data.data ?? []);
      setClasses(clsRes.data.data ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sourceClass = useMemo(() => classes.find(c => c.id === sourceClassId) ?? null, [classes, sourceClassId]);
  const targetClass = useMemo(() => classes.find(c => c.id === targetClassId) ?? null, [classes, targetClassId]);

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
    if (!sourceClassId) return [];
    return students.filter(s => s.enrollments.some(e => e.isCurrent && e.classId === sourceClassId));
  }, [students, sourceClassId]);

  const searchFiltered = useMemo(() => {
    if (!search) return filteredStudents;
    const q = search.toLowerCase();
    return filteredStudents.filter(s =>
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.studentUid.toLowerCase().includes(q) ||
      (s.studentCode ?? '').toLowerCase().includes(q)
    );
  }, [filteredStudents, search]);

  const isAllSelected = searchFiltered.length > 0 && searchFiltered.every(s => selectedIds.has(s.id));
  const isIndeterminate = searchFiltered.some(s => selectedIds.has(s.id)) && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(searchFiltered.map(s => s.id)));
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePromote = async () => {
    if (!targetClassId || !newAcademicYear || selectedIds.size === 0) return;
    setPromoting(true);
    try {
      const enrollments = await api.get('/enrollments', { params: { classId: sourceClassId, isCurrent: 'true' } });
      const currentEnrollments = enrollments.data.data ?? [];

      for (const studentId of selectedIds) {
        const enrollment = currentEnrollments.find((e: any) => e.studentId === studentId);
        if (enrollment) {
          await api.post('/enrollments/promote', {
            enrollmentId: enrollment.id,
            newClassId: targetClassId,
            newAcademicYear,
          }, { skipToast: true });
        }
      }

      setPromoted(true);
      setSelectedIds(new Set());
      fetchData();
      toast.success(`${selectedIds.size} student(s) promoted`);
      setTimeout(() => setPromoted(false), 3000);
    } catch {
      toast.error('Could not promote students');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {/* Action Bar */}
      <Box sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <IconButton size="small" sx={{ display: { md: 'none' } }} onClick={() => setSidebarOpen(true)}>
            <FilterListIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography sx={{ fontSize: { xs: '0.875rem', md: '1.125rem' }, fontWeight: 700, color: '#1e293b' }}>Student Promotion</Typography>
        </Box>

        {/* Promotion Controls */}
        <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', md: 'flex-end' }, gap: { xs: 1, md: 2 }, flexWrap: 'wrap' }}>
          <Autocomplete
            options={classes}
            value={sourceClass}
            onChange={(_, v) => { setSourceClassId(v?.id ?? null); setSelectedIds(new Set()); }}
            getOptionLabel={classLabel}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            sx={{ minWidth: { xs: '100%', md: 200 } }}
            slotProps={{ listbox: { style: { maxHeight: 200 } } }}
            renderInput={(params) => <TextField {...params} placeholder="From Class" variant="outlined" size="small" />}
          />

          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', color: '#94a3b8', px: 1 }}>
            <SwapHorizIcon sx={{ fontSize: 20 }} />
          </Box>

          <Autocomplete
            options={classes.filter(c => c.id !== sourceClassId)}
            value={targetClass}
            onChange={(_, v) => setTargetClassId(v?.id ?? null)}
            getOptionLabel={classLabel}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            sx={{ minWidth: { xs: '100%', md: 200 } }}
            slotProps={{ listbox: { style: { maxHeight: 200 } } }}
            renderInput={(params) => <TextField {...params} placeholder="To Class" variant="outlined" size="small" />}
          />

          <TextField
            size="small"
            placeholder="New Academic Year"
            value={newAcademicYear}
            onChange={(e) => setNewAcademicYear(e.target.value)}
            sx={{ minWidth: { xs: '100%', md: 160 } }}
          />

          <Button
            variant="contained"
            disabled={selectedIds.size === 0 || !targetClassId || !newAcademicYear || promoting}
            onClick={handlePromote}
            startIcon={promoting ? <CircularProgress size={14} color="inherit" /> : promoted ? <CheckCircleIcon /> : <SwapHorizIcon />}
            sx={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
          >
            {promoting ? 'Promoting...' : promoted ? 'Done!' : `Promote ${selectedIds.size || ''}`}
          </Button>
        </Box>
      </Box>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 0.75, bgcolor: 'primary.main', color: 'white' }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{selectedIds.size} student(s) selected</Typography>
          <Button size="small" onClick={() => setSelectedIds(new Set())} sx={{ color: 'white', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem' }}>Clear</Button>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        <Box sx={{ width: 224, borderRight: '1px solid', borderColor: 'divider', p: 1.5, overflow: 'auto', display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>CLASSES</Typography>
          <Box
            onClick={() => { setSourceClassId(null); setSelectedIds(new Set()); }}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: sourceClassId === null ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.5 }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: sourceClassId === null ? '#f59e0b' : '#1e293b' }}>Select a class</Typography>
          </Box>
          {classTree.map((level, idx) => (
            <TreeItem key={idx} item={level} activeClassId={sourceClassId} onSelectClass={(id) => { setSourceClassId(id); setSelectedIds(new Set()); }} />
          ))}
        </Box>

        {/* Mobile Sidebar */}
        <Drawer anchor="left" open={sidebarOpen} onClose={() => setSidebarOpen(false)} slotProps={{ paper: { sx: { width: 264, p: 1.5 } } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Source Class</Typography>
            <IconButton size="small" onClick={() => setSidebarOpen(false)}><CloseIcon sx={{ fontSize: 18 }} /></IconButton>
          </Box>
          <Box
            onClick={() => { setSourceClassId(null); setSelectedIds(new Set()); setSidebarOpen(false); }}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: sourceClassId === null ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.5 }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: sourceClassId === null ? '#f59e0b' : '#1e293b' }}>Select a class</Typography>
          </Box>
          {classTree.map((level, idx) => (
            <TreeItem key={idx} item={level} activeClassId={sourceClassId} onSelectClass={(id) => { setSourceClassId(id); setSelectedIds(new Set()); setSidebarOpen(false); }} />
          ))}
        </Drawer>

        {/* Table */}
        <TableContainer component={Paper} sx={{ flex: 1, boxShadow: 'none', borderRadius: 0 }}>
          {!sourceClassId ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, py: 8, color: '#94a3b8' }}>
              <SwapHorizIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#475569', mb: 0.5 }}>Select a source class</Typography>
              <Typography sx={{ fontSize: '0.8125rem' }}>Choose a class from the sidebar to view its students</Typography>
            </Box>
          ) : loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, py: 8 }}><CircularProgress size={24} /></Box>
          ) : (
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={cellHeaderSx}>
                    <Checkbox size="small" checked={isAllSelected} indeterminate={isIndeterminate} onChange={handleToggleAll} />
                  </TableCell>
                  <TableCell sx={cellHeaderSx}>Name</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', sm: 'table-cell' } }}>Gender</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', md: 'table-cell' } }}>Current Class</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', lg: 'table-cell' } }}>Student Code</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchFiltered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}>
                    <Typography variant="body2" color="text.secondary">No students in this class</Typography>
                  </TableCell></TableRow>
                ) : (
                  searchFiltered.map((stu, index) => {
                    const isSelected = selectedIds.has(stu.id);
                    return (
                      <TableRow
                        key={stu.id}
                        hover
                        selected={isSelected}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'rgba(25,118,210,0.04)' : index % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white',
                          '&:hover': { bgcolor: isSelected ? 'rgba(25,118,210,0.08)' : 'rgba(0,31,63,0.04)' },
                        }}
                        onClick={() => handleToggleRow(stu.id)}
                      >
                        <TableCell padding="checkbox" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Checkbox size="small" checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={() => handleToggleRow(stu.id)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: stu.studentPhoto ? 'transparent' : 'rgba(0,31,63,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                              {stu.studentPhoto ? (
                                <img src={stu.studentPhoto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <PersonIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                              )}
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>{stu.firstName} {stu.lastName}</Typography>
                              <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{stu.studentUid}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'table-cell' } }}>{stu.gender ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'table-cell' } }}>{getCurrentClassName(stu)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', lg: 'table-cell' } }}>{stu.studentCode || stu.studentUid}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Box>
    </Box>
  );
}
