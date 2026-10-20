import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, IconButton, Checkbox, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Button, Drawer, Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LinkIcon from '@mui/icons-material/Link';
import CategoryIcon from '@mui/icons-material/Category';
import { Link, useNavigate } from 'react-router-dom';
import { listSubjects, deleteSubject, listSubjectCategories, getSubjectById } from '@/services/api';
import type { ApiSubject, ApiSubjectDetail } from '@/types';

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

const cellHeaderSx = { fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' };

export default function SubjectsPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileSubject, setProfileSubject] = useState<ApiSubjectDetail | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subjectData, categoryData] = await Promise.all([
        listSubjects(),
        listSubjectCategories(),
      ]);
      setSubjects(subjectData ?? []);
      setCategories(categoryData ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredSubjects = useMemo(() => {
    let list = subjects;
    if (activeCategory) {
      list = list.filter(s => s.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.code ?? '').toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [subjects, activeCategory, search]);

  const isAllSelected = filteredSubjects.length > 0 && filteredSubjects.every(s => selectedIds.has(s.id));
  const isIndeterminate = filteredSubjects.some(s => selectedIds.has(s.id)) && !isAllSelected;

  const handleToggleAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredSubjects.map(s => s.id)));
  };

  const handleToggleRow = async (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setProfileLoading(true);
    try {
      const data = await getSubjectById(id);
      setProfileSubject(data);
    } catch { setProfileSubject(null); } finally { setProfileLoading(false); }
  };

  const handleClearSelection = () => { setSelectedIds(new Set()); setProfileSubject(null); };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} subject(s)?`)) return;
    try {
      await Promise.all([...selectedIds].map(id => deleteSubject(id)));
      setSubjects(prev => prev.filter(s => !selectedIds.has(s.id)));
      handleClearSelection();
      const categoryData = await listSubjectCategories();
      setCategories(categoryData ?? []);
    } catch {}
  };

  const selectedCount = selectedIds.size;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'white', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, py: 1, borderBottom: '1px solid', borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ display: { md: 'none' } }} onClick={() => setSidebarOpen(true)}><FilterListIcon sx={{ fontSize: 18 }} /></IconButton>
          <Box component={Link} to="/subjects/new" sx={{ bgcolor: 'primary.main', color: 'white', px: { xs: 1.5, md: 2 }, py: 0.75, borderRadius: 1, fontSize: { xs: '0.75rem', md: '0.875rem' }, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', '&:hover': { opacity: 0.9 } }}>New Subject</Box>
          <Typography sx={{ fontSize: { xs: '0.8125rem', md: '1rem' }, fontWeight: 600, color: '#1e293b' }}>Subjects</Typography>
          <IconButton size="small"><SettingsIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, justifyContent: 'flex-end' }}>
          <TextField size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} /></InputAdornment>, sx: { fontSize: '0.875rem', bgcolor: 'white', '& fieldset': { borderColor: '#cbd5e1' } } } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 }, maxWidth: { xs: 180, md: 280 }, width: '100%' }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap' }}>{filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''}</Typography>
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
            <Button size="small" startIcon={<EditIcon sx={{ fontSize: 14 }} />} disabled={selectedCount !== 1} onClick={() => navigate(`/subjects/${[...selectedIds][0]}/edit`)}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.15)' } }} variant="outlined">Edit</Button>
            <Button size="small" startIcon={<DeleteOutlinedIcon sx={{ fontSize: 14 }} />} onClick={handleDelete}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.6875rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined">Delete</Button>
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop Sidebar */}
        <Box sx={{ width: 224, borderRight: '1px solid', borderColor: 'divider', p: 1.5, overflow: 'auto', display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>CATEGORIES</Typography>
          <Box onClick={() => setActiveCategory(null)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: activeCategory === null ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: activeCategory === null ? '#f59e0b' : '#1e293b' }}>All Subjects</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: activeCategory === null ? '#f59e0b' : '#64748b' }}>{subjects.length}</Typography>
          </Box>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.category;
            return (
              <Box key={cat.category} onClick={() => setActiveCategory(isActive ? null : cat.category)}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.4, borderRadius: 0.5, cursor: 'pointer', bgcolor: isActive ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' } }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#f59e0b' : '#475569' }}>{cat.category}</Typography>
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: isActive ? '#f59e0b' : '#94a3b8' }}>{cat.count}</Typography>
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
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: activeCategory === null ? '#f59e0b' : '#1e293b' }}>All Subjects</Typography>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: activeCategory === null ? '#f59e0b' : '#64748b' }}>{subjects.length}</Typography>
          </Box>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.category;
            return (
              <Box key={cat.category} onClick={() => { setActiveCategory(isActive ? null : cat.category); setSidebarOpen(false); }}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', bgcolor: isActive ? 'rgba(245,158,11,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(245,158,11,0.08)' }, mb: 0.25 }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#f59e0b' : '#475569' }}>{cat.category}</Typography>
                <Typography sx={{ fontSize: '0.625rem', fontWeight: 500, color: isActive ? '#f59e0b' : '#94a3b8' }}>{cat.count}</Typography>
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
                  <TableCell sx={cellHeaderSx}>Subject</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', sm: 'table-cell' } }}>Code</TableCell>
                  <TableCell sx={{ ...cellHeaderSx, display: { xs: 'none', md: 'table-cell' } }}>Category</TableCell>
                  <TableCell sx={cellHeaderSx}>Combinations</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSubjects.length === 0 ? (
                  <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: '#94a3b8' }}><Typography variant="body2" color="text.secondary">No subjects found</Typography></TableCell></TableRow>
                ) : (
                  filteredSubjects.map((subject, index) => {
                    const isSelected = selectedIds.has(subject.id);
                    const comboCount = subject._count?.combinationSubjects ?? 0;
                    return (
                      <TableRow key={subject.id} hover selected={isSelected}
                        sx={{ cursor: 'pointer', bgcolor: isSelected ? 'rgba(25,118,210,0.04)' : index % 2 !== 0 ? 'rgba(0,31,63,0.02)' : 'white', '&:hover': { bgcolor: isSelected ? 'rgba(25,118,210,0.08)' : 'rgba(0,31,63,0.04)' } }}
                        onClick={() => handleToggleRow(subject.id)}>
                        <TableCell padding="checkbox" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Checkbox size="small" checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={() => handleToggleRow(subject.id)} />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#334155', borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'rgba(156,39,176,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <MenuBookIcon sx={{ fontSize: 16, color: '#9c27b0' }} />
                            </Box>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>{subject.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'table-cell' } }}>
                          {subject.code ? (
                            <Box sx={{ display: 'inline-flex', px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: 'rgba(0,0,0,0.04)' }}>
                              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>{subject.code}</Typography>
                            </Box>
                          ) : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569', borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'table-cell' } }}>{subject.category ?? '—'}</TableCell>
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24, borderRadius: 1, bgcolor: comboCount > 0 ? 'rgba(156,39,176,0.08)' : 'rgba(0,0,0,0.04)', px: 0.75 }}>
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: comboCount > 0 ? '#9c27b0' : '#94a3b8' }}>{comboCount}</Typography>
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
        <Collapse in={!!profileSubject} orientation="horizontal" timeout={250} slotProps={{ root: { sx: { height: '100%', flexShrink: 0 } } }}>
          <Box sx={{ width: { md: 300 }, height: '100%', borderLeft: '1px solid', borderColor: 'divider', overflow: 'auto', flexShrink: 0, display: { xs: 'none', md: 'block' }, bgcolor: 'white' }}>
            {profileSubject && (<>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b' }}>Subject Details</Typography>
                <IconButton size="small" onClick={() => setProfileSubject(null)}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
              </Box>
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 1, bgcolor: 'rgba(156,39,176,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                  <MenuBookIcon sx={{ fontSize: 28, color: '#9c27b0' }} />
                </Box>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{profileSubject.name}</Typography>
                {profileSubject.code && (
                  <Box sx={{ mt: 0.5, px: 1, py: 0.25, borderRadius: 0.5, bgcolor: 'rgba(0,0,0,0.04)' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace', color: '#64748b' }}>{profileSubject.code}</Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ px: 2, py: 1 }}>
                <SectionTitle>Information</SectionTitle>
                <ProfileRow icon={<CategoryIcon sx={{ fontSize: 16 }} />} label="Category" value={profileSubject.category} />
                <ProfileRow icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />} label="Created" value={new Date(profileSubject.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
                <SectionTitle sx={{ mt: 2 }}>Combinations ({profileSubject.combinationSubjects?.length ?? 0})</SectionTitle>
                {profileLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={16} /></Box>
                ) : profileSubject.combinationSubjects?.length === 0 ? (
                  <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Not linked to any combination</Typography>
                ) : (
                  <Box sx={{ maxHeight: 240, overflow: 'auto' }}>
                    {profileSubject.combinationSubjects?.map((cs) => (
                      <Box key={cs.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <LinkIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                          {cs.combination?.displayName ?? cs.combination?.name ?? 'Unknown'}
                        </Typography>
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
