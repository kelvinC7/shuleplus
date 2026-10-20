import { useState } from 'react';
import { Box, CircularProgress, Pagination, Typography } from '@mui/material';
import { useStudentReportsData } from './hooks/use-student-reports-data';
import { ReportsPageHeader } from './components/reports-page-header';
import { ReportsKpiCards } from './components/reports-kpi-cards';
import { QuickFilterPresets } from './components/quick-filter-presets';
import { ReportsFilterPanel } from './components/reports-filter-panel';
import { BulkActionsBar } from './components/bulk-actions-bar';
import { ColumnSettingsMenu } from './components/column-settings-menu';
import { ReportsTable } from './components/reports-table';
import { StudentDetailsDrawer } from './components/student-details-drawer';
import { ExportReportModal, type ExportFormat } from './components/export-report-modal';
import { exportStudentRows, printStudentReport } from './export';

const NAVY = '#000435';

export function StudentReportsView() {
  const data = useStudentReportsData();
  const [exportOpen, setExportOpen] = useState(false);

  function resolveExportRows(scope: 'filtered' | 'selected' | 'all') {
    if (scope === 'selected') return data.selectedRows;
    if (scope === 'all') return data.sorted;
    return data.filtered;
  }

  function handleExport(format: ExportFormat, columns: string[], scope: 'filtered' | 'selected' | 'all') {
    const rows = resolveExportRows(scope);
    exportStudentRows(rows, columns, format);
    setExportOpen(false);
  }

  function handlePrint(scope: 'filtered' | 'selected' = 'filtered') {
    const rows = scope === 'selected' ? data.selectedRows : data.filtered;
    const cols = ['Student Name', 'Student Code', 'Class', 'Gender', 'Status', 'Enrollment Date'];
    printStudentReport(rows, cols);
  }

  if (data.loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} sx={{ color: '#FCB038' }} />
      </Box>
    );
  }

  const start = (data.page - 1) * 25 + 1;
  const end = Math.min(data.page * 25, data.filtered.length);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', pb: 4 }}>
      <ReportsPageHeader
        onExport={() => setExportOpen(true)}
        onPrint={() => handlePrint('filtered')}
        onGenerate={() => setExportOpen(true)}
      />

      <Box sx={{ mb: 3 }}>
        <ReportsKpiCards kpis={data.kpis} />
      </Box>

      <QuickFilterPresets
        active={data.filters.preset}
        onChange={(preset) => data.updateFilter('preset', preset)}
      />

      <ReportsFilterPanel
        open={data.filtersOpen}
        onToggle={() => data.setFiltersOpen((o) => !o)}
        filters={data.filters}
        onChange={data.updateFilter}
        onClear={data.clearFilters}
        classes={data.classes}
        students={data.students}
        academicSettings={data.academicSettings}
      />

      <BulkActionsBar
        count={data.selectedIds.size}
        onClear={data.clearSelection}
        onExport={() => setExportOpen(true)}
        onPrint={() => handlePrint('selected')}
        onViewProfiles={() => {
          const id = [...data.selectedIds][0];
          if (id) data.setDrawerStudentId(id);
        }}
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 800, color: NAVY }}>Student List</Typography>
        <ColumnSettingsMenu visibleColumns={data.visibleColumns} onToggle={data.toggleColumn} />
      </Box>

      <ReportsTable
        rows={data.paginated}
        selectedIds={data.selectedIds}
        visibleColumns={data.visibleColumns}
        sortField={data.sortField}
        sortDir={data.sortDir}
        onSort={data.toggleSort}
        onToggleSelect={data.toggleSelect}
        onToggleSelectAll={data.toggleSelectAll}
        onRowClick={data.setDrawerStudentId}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
          Showing {data.filtered.length ? start : 0}–{end} of {data.filtered.length.toLocaleString()}
        </Typography>
        <Pagination
          count={data.totalPages}
          page={data.page}
          onChange={(_, p) => data.setPage(p)}
          shape="rounded"
          size="small"
          sx={{ '& .MuiPaginationItem-root.Mui-selected': { bgcolor: NAVY, color: '#FCB038' } }}
        />
      </Box>

      <StudentDetailsDrawer
        row={data.drawerStudent}
        open={Boolean(data.drawerStudent)}
        onClose={() => data.setDrawerStudentId(null)}
        onPrint={() => {
          if (data.drawerStudent) printStudentReport([data.drawerStudent], ['Student Name', 'Student Code', 'Class', 'Gender', 'Status']);
        }}
      />

      <ExportReportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        selectedCount={data.selectedIds.size}
        filteredCount={data.filtered.length}
        totalCount={data.students.length}
        visibleColumns={data.visibleColumns}
        academicYear={data.filters.academicYear}
        term={data.filters.term}
      />
    </Box>
  );
}
