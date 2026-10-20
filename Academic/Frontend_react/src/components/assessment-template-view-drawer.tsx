import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { getAssessmentTemplate } from '@/services/api';
import { educationLevelLabel } from '@/lib/education-levels';
import { termDisplayLabel } from '@/lib/assessment-template-terms';
import type { ApiAssessmentTemplate } from '@/types';

const NAVY = '#000435';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#fef3c7', color: '#b45309' },
  ACTIVE: { bg: '#d1fae5', color: '#059669' },
  ARCHIVED: { bg: '#e2e8f0', color: '#64748b' },
  REJECTED: { bg: '#fee2e2', color: '#dc2626' },
};

export function AssessmentTemplateViewDrawer({
  templateId,
  open,
  onClose,
  onEdit,
}: {
  templateId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (id: string) => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<ApiAssessmentTemplate | null>(null);

  useEffect(() => {
    if (!open || !templateId) {
      setTemplate(null);
      return;
    }
    setLoading(true);
    void getAssessmentTemplate(templateId)
      .then(setTemplate)
      .catch(() => setTemplate(null))
      .finally(() => setLoading(false));
  }, [open, templateId]);

  const statusStyle = STATUS_STYLE[template?.status ?? 'DRAFT'] ?? STATUS_STYLE.DRAFT;
  const components = [...(template?.components ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: fullScreen ? '100%' : { xs: '100%', sm: 440, md: 480 },
          maxWidth: '100vw',
          borderTopLeftRadius: fullScreen ? 0 : 16,
          borderBottomLeftRadius: fullScreen ? 0 : 16,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f8fafc' }}>
        <Box
          sx={{
            px: 2.5,
            py: 2,
            bgcolor: '#fff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase' }}>
              Template
            </Typography>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, color: NAVY, mt: 0.25 }} noWrap>
              {template?.name ?? '—'}
            </Typography>
            {template ? (
              <Chip
                label={template.status}
                size="small"
                sx={{ mt: 1, fontWeight: 800, bgcolor: statusStyle.bg, color: statusStyle.color }}
              />
            ) : null}
          </Box>
          {template && onEdit ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => {
                onEdit(template.id);
                onClose();
              }}
              sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 1.5, flexShrink: 0 }}
            >
              Edit
            </Button>
          ) : null}
          <IconButton onClick={onClose} aria-label="Close" sx={{ mt: -0.5 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={28} />
            </Box>
          ) : !template ? (
            <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 8 }}>Template not found</Typography>
          ) : (
            <>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e2e8f0', mb: 2 }}>
                <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.55 }}>
                  {template.description || 'No description'}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 2 }}>
                  <Meta label="Education level" value={educationLevelLabel(template.academicLevel)} />
                  <Meta label="Default marks" value={String(template.defaultCourseMarks ?? 100)} />
                  <Meta label="Academic year" value={template.academicYear} />
                  <Meta label="Term" value={termDisplayLabel(template.term)} />
                </Box>
              </Box>

              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 1 }}>
                Components ({components.length})
              </Typography>
              <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0', bgcolor: '#fff', mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      {['Name', 'Weight', 'Status'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.6875rem', color: '#64748b' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {components.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell sx={{ fontWeight: 600, color: NAVY }}>{c.name}</TableCell>
                        <TableCell>{c.weightPercentage ?? 0}%</TableCell>
                        <TableCell>
                          <Chip
                            label={c.isActive !== false ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              bgcolor: c.isActive !== false ? '#d1fae5' : '#f1f5f9',
                              color: c.isActive !== false ? '#059669' : '#64748b',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mb: 1 }}>
                Classes ({template.assignments?.length ?? 0})
              </Typography>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e2e8f0', maxHeight: 200, overflow: 'auto' }}>
                {(template.assignments ?? []).length === 0 ? (
                  <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8' }}>No class assignments yet</Typography>
                ) : (
                  (template.assignments ?? []).map((a) => (
                    <Typography key={a.id} sx={{ fontSize: '0.8125rem', color: '#475569', py: 0.35 }}>
                      {a.class?.stream ? `${a.class.name} ${a.class.stream}` : a.class?.name ?? a.classId}
                    </Typography>
                  ))
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: NAVY }}>{value}</Typography>
    </Box>
  );
}
