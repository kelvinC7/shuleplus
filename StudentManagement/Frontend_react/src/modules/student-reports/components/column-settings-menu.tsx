import { Button, Checkbox, FormControlLabel, Menu, Typography } from '@mui/material';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { useState } from 'react';
import { REPORT_COLUMNS, type ReportColumnId } from '../types';

export function ColumnSettingsMenu({
  visibleColumns,
  onToggle,
}: {
  visibleColumns: Set<ReportColumnId>;
  onToggle: (id: ReportColumnId) => void;
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  return (
    <>
      <Button
        size="small"
        startIcon={<ViewColumnOutlinedIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ textTransform: 'none', fontWeight: 600, color: '#000435', borderRadius: 2 }}
      >
        Columns
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} sx={{ '& .MuiPaper-root': { borderRadius: 2, minWidth: 220, p: 1 } }}>
        <Typography sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
          Show / hide columns
        </Typography>
        {REPORT_COLUMNS.map((col) => (
          <FormControlLabel
            key={col.id}
            sx={{ display: 'flex', mx: 0, px: 1 }}
            control={
              <Checkbox
                size="small"
                checked={visibleColumns.has(col.id)}
                onChange={() => onToggle(col.id)}
              />
            }
            label={<Typography sx={{ fontSize: '0.8125rem' }}>{col.label}</Typography>}
          />
        ))}
      </Menu>
    </>
  );
}
