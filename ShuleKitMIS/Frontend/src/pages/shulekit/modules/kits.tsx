import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  TablePagination,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Print,
  MoreVert,
  ArrowBack,
  VisibilityOutlined,
  EditOutlined,
  DeleteOutlined,
  Inventory2,
  CloudUpload,
} from '@mui/icons-material';
import {
  ACCENT,
  PRIMARY,
  PRIMARY_DARK,
  HEADER_BG,
  BORDER,
  CUSTOM_SCROLLBAR,
  PAGE_TITLE,
  SECTION_LABEL,
  CARD,
  CARD_BG,
} from '../styles';
import { SearchInput, ImageUpload } from '../components';
import { createKit, deleteKit, getKitById, listRequests, updateKit, uploadImage } from '@/services/api';
import type { KitRequirementInput } from '@/services/api';
import type { Kit, KitRequest } from '@/types';

const GRADE_LEVELS = ['Nursery', 'Primary', 'O-Level', 'A-Level'];
const STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

function emptyRequirement(): KitRequirementInput {
  return { title: '', quantity: 1, unitPrice: '', imageUrl: '', notes: '' };
}

function kitStatusChip(status: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: '#fef3c7', fg: '#92400e' },
    ACTIVE: { bg: '#dcfce7', fg: '#166534' },
    ARCHIVED: { bg: '#e2e8f0', fg: '#475569' },
  };
  const s = map[status] ?? map.ACTIVE;
  return (
    <Chip
      label={status}
      size="small"
      sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 600, borderRadius: '2px', fontSize: '0.65rem', height: 20 }}
    />
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        mb: 0.5,
        color: 'rgba(0,0,0,0.6)',
        fontWeight: 700,
        fontSize: '0.7rem',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
  );
}

function RequirementImageCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Box sx={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
      <Box
        onClick={() => inputRef.current?.click()}
        sx={{
          width: 44,
          height: 44,
          borderRadius: '2px',
          border: `1px dashed ${BORDER}`,
          bgcolor: CARD_BG,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          '&:hover': { borderColor: ACCENT },
        }}
      >
        {value ? (
          <Box
            component="img"
            src={value}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : uploading ? (
          <CircularProgress size={16} />
        ) : (
          <CloudUpload sx={{ fontSize: 18, color: 'rgba(0,0,0,0.3)' }} />
        )}
      </Box>
      {value && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onChange('');
          }}
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            bgcolor: 'white',
            border: `1px solid ${BORDER}`,
            width: 18,
            height: 18,
            '&:hover': { bgcolor: '#fff' },
          }}
        >
          <DeleteOutlined sx={{ fontSize: 12, color: '#dc2626' }} />
        </IconButton>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </Box>
  );
}

interface KitsModuleProps {
  kits: Kit[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function KitsModule({
  kits,
  loading,
  error,
  onOpen,
  onNew,
  onEdit,
  onDelete,
}: KitsModuleProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kits.filter((k) => {
      if (statusFilter && k.status !== statusFilter) return false;
      if (gradeFilter && k.gradeLevel !== gradeFilter) return false;
      if (!q) return true;
      return (
        k.name.toLowerCase().includes(q) ||
        k.gradeLevel.toLowerCase().includes(q) ||
        (k.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [kits, search, statusFilter, gradeFilter]);

  const handleActionClick = (event: MouseEvent<HTMLElement>, kit: Kit) => {
    setActionAnchorEl(event.currentTarget);
    setSelectedKit(kit);
  };

  const closeAction = () => {
    setActionAnchorEl(null);
    setSelectedKit(null);
  };

  const handleDelete = async () => {
    if (!selectedKit) return;
    if (window.confirm('Delete this kit and its requirements?')) {
      await onDelete(selectedKit.id);
    }
    closeAction();
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={PAGE_TITLE}>
            Kits
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onNew}
            sx={{
              height: 28,
              bgcolor: PRIMARY,
              borderRadius: '2px',
              textTransform: 'none',
              fontSize: '0.7rem',
              fontWeight: 700,
              px: 2,
              '&:hover': { bgcolor: PRIMARY_DARK },
            }}
          >
            New
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <SearchInput
            placeholder="Search kits..."
            value={search}
            onChange={setSearch}
            onFilterClick={(e) => setFilterAnchorEl(e.currentTarget)}
          />
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => window.print()}
            sx={{
              height: 36,
              borderRadius: '2px',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              borderColor: 'rgba(0,0,0,0.1)',
              color: 'rgba(0,0,0,0.7)',
              '&:hover': { borderColor: 'rgba(0,0,0,0.2)', bgcolor: 'rgba(0,0,0,0.05)' },
            }}
          >
            Print
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: HEADER_BG,
              color: PRIMARY,
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderRadius: '4px',
              minWidth: 240,
              mt: 1,
              '& .MuiMenuItem-root': { fontSize: '0.85rem', py: 0.75, px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' } },
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Typography sx={{ px: 2, pt: 1.5, ...SECTION_LABEL }}>Status</Typography>
        {['', ...STATUSES].map((s) => (
          <MenuItem
            key={s || 'all-status'}
            selected={statusFilter === s}
            onClick={() => {
              setStatusFilter(s);
              setFilterAnchorEl(null);
            }}
          >
            {s || 'All statuses'}
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5, borderColor: BORDER }} />
        <Typography sx={{ px: 2, pt: 1.5, ...SECTION_LABEL }}>Grade</Typography>
        {['', ...GRADE_LEVELS].map((g) => (
          <MenuItem
            key={g || 'all-grade'}
            selected={gradeFilter === g}
            onClick={() => {
              setGradeFilter(g);
              setFilterAnchorEl(null);
            }}
          >
            {g || 'All grades'}
          </MenuItem>
        ))}
      </Menu>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer
            sx={{
              bgcolor: 'rgba(0,0,0,0.02)',
              border: `1px solid ${BORDER}`,
              borderRadius: '2px',
              ...CUSTOM_SCROLLBAR,
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: HEADER_BG, color: 'rgba(0,0,0,0.4)', fontWeight: 700, fontSize: '0.65rem', py: 1, borderBottom: `1px solid ${BORDER}` } }}>
                  <TableCell>Kit Name</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((kit) => (
                    <TableRow
                      key={kit.id}
                      hover
                      onClick={() => onOpen(kit.id)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                        '& td': { borderBottom: '1px solid rgba(0,0,0,0.03)', py: 0.75 },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: 'rgba(0,0,0,0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {kit.imageUrl ? (
                              <Box
                                component="img"
                                src={kit.imageUrl}
                                alt={kit.name}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Inventory2 sx={{ fontSize: 16, color: 'rgba(0,0,0,0.4)' }} />
                            )}
                          </Box>
                          <Box>
                            <Typography sx={{ color: PRIMARY, fontSize: '0.75rem', fontWeight: 700 }}>
                              {kit.name}
                            </Typography>
                            <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.62rem' }}>
                              {kit.requirements.length} item{kit.requirements.length === 1 ? '' : 's'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={kit.gradeLevel}
                          size="small"
                          sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.6)', borderRadius: '2px', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                          {Number(kit.amount).toLocaleString()} RWF
                        </Typography>
                      </TableCell>
                      <TableCell>{kitStatusChip(kit.status)}</TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          sx={{ color: 'rgba(0,0,0,0.2)', '&:hover': { color: PRIMARY } }}
                          onClick={(e) => handleActionClick(e, kit)}
                        >
                          <MoreVert sx={{ fontSize: 14 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center' }}>
                      <Typography sx={{ color: 'rgba(0,0,0,0.2)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No kits found. Click "New" to create one!
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter sx={{ borderTop: `1px solid ${BORDER}` }}>
                <TableRow>
                  <TableCell colSpan={3} sx={{ color: 'rgba(0,0,0,0.4)', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>
                    Kit Summary
                  </TableCell>
                  <TableCell sx={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>
                    {filtered.length} kits
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>

          <Menu
            anchorEl={actionAnchorEl}
            open={Boolean(actionAnchorEl)}
            onClose={closeAction}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: HEADER_BG,
                  color: PRIMARY,
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  borderRadius: '4px',
                  '& .MuiMenuItem-root': { fontSize: '0.85rem', gap: 1.5, py: 1, px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' } },
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem
              onClick={() => {
                if (selectedKit) onOpen(selectedKit.id);
                closeAction();
              }}
            >
              <VisibilityOutlined sx={{ fontSize: 18, color: ACCENT }} />
              View
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (selectedKit) onEdit(selectedKit.id);
                closeAction();
              }}
            >
              <EditOutlined sx={{ fontSize: 18, color: '#f59e0b' }} />
              Edit
            </MenuItem>
            <MenuItem onClick={handleDelete}>
              <DeleteOutlined sx={{ fontSize: 18, color: '#ef4444' }} />
              Delete
            </MenuItem>
          </Menu>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            sx={{
              color: 'rgba(0,0,0,0.6)',
              borderTop: `1px solid ${BORDER}`,
              '& .MuiTablePagination-selectIcon': { color: 'rgba(0,0,0,0.4)' },
              '& .MuiTablePagination-actions': { color: 'rgba(0,0,0,0.6)' },
            }}
          />
        </>
      )}
    </>
  );
}

interface KitDetailProps {
  kitId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onNewRequest: () => void;
}

export function KitDetail({ kitId, onBack, onEdit, onNewRequest }: KitDetailProps) {
  const [kit, setKit] = useState<Kit | null>(null);
  const [requests, setRequests] = useState<KitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kitId) return;
    Promise.all([getKitById(kitId), listRequests({ kitId })])
      .then(([k, r]) => {
        setKit(k);
        setRequests(r.requests);
      })
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to load kit'
        );
      })
      .finally(() => setLoading(false));
  }, [kitId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!kit) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">{error ?? 'Kit not found'}</Alert>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={onBack} sx={{ color: 'rgba(0,0,0,0.4)', '&:hover': { color: PRIMARY } }}>
            <ArrowBack sx={{ fontSize: 20 }} />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={PAGE_TITLE}>{kit.name}</Typography>
            <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>
              {kit.gradeLevel} · {Number(kit.amount).toLocaleString()} RWF · {requests.length} request(s)
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<EditOutlined />}
            onClick={() => onEdit(kit.id)}
            sx={{ height: 36, borderRadius: '2px', textTransform: 'none', fontWeight: 600, borderColor: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.7)' }}
          >
            Edit Kit
          </Button>
          <Button
            variant="contained"
            onClick={onNewRequest}
            sx={{ height: 36, bgcolor: PRIMARY, borderRadius: '2px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: PRIMARY_DARK } }}
          >
            New Request
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box sx={CARD}>
          {kit.imageUrl && (
            <Box
              sx={{
                height: 220,
                overflow: 'hidden',
                borderBottom: `1px solid ${BORDER}`,
                bgcolor: CARD_BG,
              }}
            >
              <Box
                component="img"
                src={kit.imageUrl}
                alt={kit.name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </Box>
          )}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
            <Typography sx={SECTION_LABEL}>Details</Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box>
                <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.7rem', fontWeight: 700, mb: 0.5 }}>
                  STATUS
                </Typography>
                {kitStatusChip(kit.status)}
              </Box>
              <Box>
                <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.7rem', fontWeight: 700, mb: 0.5 }}>
                  AMOUNT
                </Typography>
                <Typography sx={{ color: '#10b981', fontWeight: 700 }}>
                  {Number(kit.amount).toLocaleString()} RWF
                </Typography>
              </Box>
            </Box>
            {kit.description && (
              <>
                <Divider sx={{ my: 2, borderColor: BORDER }} />
                <Typography
                  sx={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}
                >
                  {kit.description}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        <Box sx={CARD}>
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
            <Typography sx={SECTION_LABEL}>Requirements</Typography>
          </Box>
          <Box sx={{ p: 2.5 }}>
            {kit.requirements.length === 0 && (
              <Typography sx={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.8rem' }}>
                No requirements defined.
              </Typography>
            )}
            {kit.requirements.map((r, i) => (
              <Box key={r.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1 }}>
                  <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    {r.imageUrl && (
                      <Box
                        component="img"
                        src={r.imageUrl}
                        alt={r.title}
                        sx={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          objectFit: 'cover',
                          borderRadius: '2px',
                          border: `1px solid ${BORDER}`,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <Box>
                      <Typography sx={{ color: PRIMARY, fontSize: '0.85rem', fontWeight: 600 }}>
                        {r.title}
                      </Typography>
                      <Typography sx={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.72rem' }}>
                        {r.notes || (Number(r.unitPrice) > 0 ? undefined : 'Included at no charge')}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    {Number(r.unitPrice) > 0 && (
                      <Chip
                        label={`${Number(r.unitPrice).toLocaleString()} RWF`}
                        size="small"
                        sx={{ bgcolor: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.7)', fontWeight: 700, fontSize: '0.65rem', height: 20, borderRadius: '2px' }}
                      />
                    )}
                    <Chip
                      label={`×${r.quantity}`}
                      size="small"
                      sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 700, fontSize: '0.65rem', height: 20, borderRadius: '2px' }}
                    />
                  </Box>
                </Box>
                {i < kit.requirements.length - 1 && <Divider sx={{ borderColor: BORDER }} />}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </>
  );
}

interface KitFormProps {
  kitId?: string;
  onSaved: () => void;
  onCancel: () => void;
  onDeleted?: () => void;
}

export function KitForm({ kitId, onSaved, onCancel, onDeleted }: KitFormProps) {
  const isEdit = Boolean(kitId);
  const [kit, setKit] = useState<Kit | null>(null);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [requirements, setRequirements] = useState<KitRequirementInput[]>([emptyRequirement()]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kitId) return;
    getKitById(kitId)
      .then((k) => {
        setKit(k);
        setName(k.name);
        setGradeLevel(k.gradeLevel);
        setDescription(k.description ?? '');
        setImageUrl(k.imageUrl ?? '');
        setAmount(k.amount);
        setStatus(k.status);
        setRequirements(
          k.requirements.length
            ? k.requirements.map((r) => ({
                title: r.title,
                quantity: r.quantity,
                unitPrice: r.unitPrice ? String(r.unitPrice) : '',
                imageUrl: r.imageUrl ?? '',
                notes: r.notes ?? '',
              }))
            : [emptyRequirement()]
        );
      })
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to load kit'
        );
      })
      .finally(() => setLoading(false));
  }, [kitId]);

  const pricedAutoTotal = requirements.reduce((sum, r) => {
    const price = Number(r.unitPrice);
    const qty = Math.max(1, Number(r.quantity) || 1);
    return Number.isFinite(price) && price > 0 ? sum + price * qty : sum;
  }, 0);
  const hasPricedItems = requirements.some((r) => Number(r.unitPrice) > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !gradeLevel || !amount) {
      setError('Name, grade level and amount are required.');
      return;
    }
    const reqs = requirements
      .filter((r) => r.title.trim())
      .map((r) => {
        const price = Number(r.unitPrice);
        return {
          title: r.title.trim(),
          quantity: r.quantity,
          unitPrice: Number.isFinite(price) && price > 0 ? price : undefined,
          imageUrl: r.imageUrl?.trim() || undefined,
          notes: r.notes?.trim() || undefined,
        };
      });
    const payload = {
      name: name.trim(),
      gradeLevel,
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      amount: Number(amount),
      status,
      requirements: reqs.length ? reqs : undefined,
    };
    setSaving(true);
    const save = isEdit && kitId ? updateKit(kitId, payload) : createKit(payload);
    save
      .then(() => onSaved())
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to save kit'
        );
      })
      .finally(() => setSaving(false));
  }

  function handleDelete() {
    if (!kitId || !onDeleted) return;
    if (!window.confirm('Delete this kit and its requirements?')) return;
    setDeleting(true);
    deleteKit(kitId)
      .then(() => onDeleted())
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to delete kit'
        );
        setDeleting(false);
      });
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isEdit && !kit) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">{error ?? 'Kit not found'}</Alert>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={onCancel} sx={{ color: 'rgba(0,0,0,0.4)', '&:hover': { color: PRIMARY } }}>
          <ArrowBack sx={{ fontSize: 20 }} />
        </IconButton>
        <Typography variant="h5" sx={PAGE_TITLE}>
          {isEdit ? 'Edit Kit' : 'New Kit'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          bgcolor: 'white',
          border: `1px solid ${BORDER}`,
          borderRadius: '2px',
          p: 4,
          maxWidth: 900,
        }}
      >
        {/* 1. Image + general fields in the same row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, gap: 4 }}>
          <ImageUpload value={imageUrl} onChange={setImageUrl} label="Kit image" height={160} maxWidth={260} />
          <Box>
             <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                columnGap: '24px',
                rowGap: '20px',
              }}
            >
              <Box>
                <FieldLabel>Kit name *</FieldLabel>
                <TextField
                  fullWidth
                  variant="standard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Primary Kit"
                  required
                />
              </Box>
              <Box>
                <FieldLabel>Grade level *</FieldLabel>
                <TextField select fullWidth variant="standard" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} required>
                  {GRADE_LEVELS.map((g) => (
                    <MenuItem key={g} value={g}>{g}</MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box>
                <FieldLabel>Status</FieldLabel>
                <TextField select fullWidth variant="standard" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box>
                <FieldLabel>Amount (RWF) *</FieldLabel>
                <TextField
                  fullWidth
                  type="number"
                  variant="standard"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 25000"
                  required
                />
              </Box>
            </div>
            <Box sx={{ mt: 2.5 }}>
              <FieldLabel>Description</FieldLabel>
              <TextField
                fullWidth
                multiline
                minRows={2}
                variant="standard"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is included in this kit?"
              />
            </Box>
          </Box>
        </Box>

        {/* 3. Requirements editable table */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography sx={SECTION_LABEL}>Requirements</Typography>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => setRequirements((prev) => [...prev, emptyRequirement()])}
            sx={{ color: PRIMARY, fontWeight: 600, textTransform: 'none' }}
          >
            Add item
          </Button>
        </Box>

        <TableContainer sx={{ border: `1px solid ${BORDER}`, borderRadius: '2px' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: HEADER_BG, color: 'rgba(0,0,0,0.5)', fontWeight: 700, fontSize: '0.65rem', py: 1, borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase' } }}>
                <TableCell sx={{ width: 70 }}>Image</TableCell>
                <TableCell>Item</TableCell>
                <TableCell sx={{ width: 70 }}>Qty</TableCell>
                <TableCell sx={{ width: 110 }}>Price (RWF)</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell sx={{ width: 50 }} align="right">Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requirements.map((req, index) => (
                <TableRow key={index} sx={{ '& td': { borderBottom: `1px solid ${BORDER}` } }}>
                  <TableCell>
                    <RequirementImageCell
                      value={req.imageUrl ?? ''}
                      onChange={(url) =>
                        setRequirements((prev) => prev.map((r, i) => (i === index ? { ...r, imageUrl: url } : r)))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      variant="standard"
                      value={req.title}
                      onChange={(e) => setRequirements((prev) => prev.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)))}
                      placeholder="e.g. Uniform set"
                      slotProps={{ htmlInput: { 'aria-label': `Item ${index + 1}` } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      variant="standard"
                      type="number"
                      value={req.quantity ?? ''}
                      onChange={(e) => setRequirements((prev) => prev.map((r, i) => (i === index ? { ...r, quantity: Number(e.target.value) } : r)))}
                      slotProps={{ htmlInput: { min: 1, 'aria-label': `Quantity item ${index + 1}` } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      variant="standard"
                      type="number"
                      value={req.unitPrice ?? ''}
                      onChange={(e) => setRequirements((prev) => prev.map((r, i) => (i === index ? { ...r, unitPrice: e.target.value } : r)))}
                      placeholder="0"
                      slotProps={{ htmlInput: { 'aria-label': `Price item ${index + 1}` } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      variant="standard"
                      value={req.notes ?? ''}
                      onChange={(e) => setRequirements((prev) => prev.map((r, i) => (i === index ? { ...r, notes: e.target.value } : r)))}
                      placeholder="Optional note"
                      slotProps={{ htmlInput: { 'aria-label': `Notes item ${index + 1}` } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => setRequirements((prev) => prev.filter((_, i) => i !== index))}
                      disabled={requirements.length === 1}
                      sx={{ color: '#dc2626' }}
                    >
                    <DeleteOutlined sx={{ fontSize: 18 }} />
                  </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {requirements.length > 1 && (
          <Chip
            label={`${requirements.filter((r) => r.title.trim()).length} item(s)`}
            size="small"
            sx={{ mt: 1, borderRadius: '2px', fontSize: '0.7rem' }}
          />
        )}
        {hasPricedItems && (
          <Box sx={{ mt: 2, p: 2, borderRadius: '2px', bgcolor: CARD_BG, border: `1px solid ${BORDER}` }}>
            <Typography sx={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.8rem' }}>
              Priced items let parents pick what they need. Auto total from priced items:
            </Typography>
            <Typography sx={{ color: '#10b981', fontWeight: 700 }}>
              {pricedAutoTotal.toLocaleString()} RWF
            </Typography>
            <Typography sx={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.7rem' }}>
              Items without a price are included at no charge. The saved kit amount is used as the default for non-priced kits.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ height: 36, bgcolor: PRIMARY, borderRadius: '2px', textTransform: 'none', fontWeight: 700, px: 4, '&:hover': { bgcolor: PRIMARY_DARK } }}
            >
              {saving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : isEdit ? 'Save Changes' : 'Save Kit'}
            </Button>
            <Button
              variant="outlined"
              onClick={onCancel}
              sx={{ height: 36, borderRadius: '2px', textTransform: 'none', fontWeight: 600, borderColor: 'rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.7)' }}
            >
              Cancel
            </Button>
          </Box>
          {isEdit && onDeleted && (
            <Button variant="outlined" color="error" onClick={handleDelete} disabled={deleting} sx={{ height: 36, borderRadius: '2px', textTransform: 'none', fontWeight: 600 }}>
              {deleting ? <CircularProgress size={18} /> : 'Delete Kit'}
            </Button>
          )}
        </Box>
      </Box>
    </>
  );
}
