import { useMemo, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { usePromotionData } from './hooks/use-promotion-data';
import { usePromotionRecords } from './hooks/use-promotion-records';
import { PromotionPageHeader } from './components/promotion-page-header';
import { PromotionDashboardStats } from './components/promotion-dashboard-stats';
import { PromotionRecordsFilter } from './components/promotion-records-filter';
import { PromotionRecordsTable } from './components/promotion-records-table';
import { PromotionRecordViewDrawer } from './components/promotion-record-view-drawer';
import { PromotionRecordEditDialog } from './components/promotion-record-edit-dialog';
import { PromotionRecordDeleteDialog } from './components/promotion-record-delete-dialog';
import { PromotionValidationPanel } from './components/promotion-validation-panel';
import { PromotionReviewStep } from './components/promotion-review-step';
import { PromotionResultStep } from './components/promotion-result-step';
import { PromotionWizard } from './components/promotion-wizard';
import type { PromotionGroup } from './types';

export function StudentPromotionView() {
  const data = usePromotionData();
  const recordsHook = usePromotionRecords(data.fromYear);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [viewGroup, setViewGroup] = useState<PromotionGroup | null>(null);
  const [editGroup, setEditGroup] = useState<PromotionGroup | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<PromotionGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  const issueCandidates = useMemo(
    () => data.candidates.filter((c) => c.issue),
    [data.candidates]
  );

  const canReview = Boolean(
    data.selectedIds.size > 0 &&
    data.fromYear &&
    data.toYear &&
    data.fromYear !== data.toYear &&
    data.readyCount > 0
  );

  function handleWizardStart(config: Parameters<typeof data.applyWizardConfig>[0]) {
    if (!config.selectedStudentIds.length) return;
    data.applyWizardConfig(config);
    data.setStep('review');
  }

  function openEditGroup(group: PromotionGroup) {
    const fresh = recordsHook.groups.find((g) => g.id === group.id) ?? group;
    setEditGroup(fresh);
  }

  async function handleRemoveStudent(recordId: string) {
    if (!editGroup) return;
    setEditBusy(true);
    try {
      const updatedGroups = await recordsHook.removeStudent(recordId);
      await data.fetchData();
      const fresh = updatedGroups.find((g) => g.id === editGroup.id) ?? null;
      setEditGroup(fresh);
    } finally {
      setEditBusy(false);
    }
  }

  async function handleAddStudent(enrollmentId: string) {
    if (!editGroup) return;
    setEditBusy(true);
    try {
      const updatedGroups = await recordsHook.addStudent(editGroup, enrollmentId);
      await data.fetchData();
      const fresh = updatedGroups.find((g) => g.id === editGroup.id) ?? editGroup;
      setEditGroup(fresh);
    } finally {
      setEditBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteGroup) return;
    setDeleting(true);
    try {
      await recordsHook.deleteGroup(deleteGroup);
      setDeleteGroup(null);
      await data.fetchData();
    } finally {
      setDeleting(false);
    }
  }

  const activeEditGroup = editGroup
    ? recordsHook.groups.find((g) => g.id === editGroup.id) ?? editGroup
    : null;

  if (data.loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '50vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} sx={{ color: '#FCB038' }} />
      </Box>
    );
  }

  if (data.step === 'review') {
    return (
      <Box sx={{ pb: 4 }}>
        <PromotionReviewStep
          fromYear={data.fromYear}
          toYear={data.toYear}
          fromClass={data.fromClass}
          toClass={data.toClass}
          candidates={data.candidates}
          readyCount={data.readyCount}
          reviewCount={data.reviewCount}
          promoting={data.promoting}
          onBack={() => data.setStep('setup')}
          onConfirm={async () => {
            await data.executePromotion();
            recordsHook.fetchRecords();
          }}
        />
      </Box>
    );
  }

  if (data.step === 'result' && data.result) {
    return (
      <Box sx={{ pb: 4 }}>
        <PromotionResultStep
          fromYear={data.fromYear}
          toYear={data.toYear}
          fromClass={data.fromClass}
          toClass={data.toClass}
          totalSelected={data.candidates.length}
          result={data.result}
          onPromoteAnother={() => {
            data.resetWorkflow();
            setWizardOpen(true);
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', pb: 4 }}>
      <PromotionPageHeader
        fromYear={data.fromYear}
        toYear={data.toYear}
        onStartPromotion={() => setWizardOpen(true)}
        startDisabled={!data.fromYear || !data.toYear}
        canReview={canReview}
        onReview={() => data.setStep('review')}
        selectedCount={data.readyCount}
      />

      <PromotionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onStart={handleWizardStart}
        academicSettings={data.academicSettings}
        classes={data.classes}
        students={data.students}
        initial={{
          fromYear: data.fromYear,
          toYear: data.toYear,
          mode: data.mode,
          fromClassId: data.fromClassId,
          toClassId: data.toClassId,
          selectedStudentIds: [...data.selectedIds],
        }}
      />

      <Box sx={{ mb: 2 }}>
        <PromotionDashboardStats stats={data.stats} />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <PromotionRecordsFilter
          search={recordsHook.search}
          classFilter={recordsHook.classFilter}
          classes={data.classes}
          recordCount={recordsHook.groups.length}
          onSearchChange={recordsHook.setSearch}
          onClassFilterChange={recordsHook.setClassFilter}
        />

        <PromotionRecordsTable
          groups={recordsHook.groups}
          loading={recordsHook.loading}
          onStartPromotion={() => setWizardOpen(true)}
          onView={setViewGroup}
          onEdit={openEditGroup}
          onDelete={setDeleteGroup}
        />
      </Box>

      {(data.readyCount > 0 || data.reviewCount > 0) && canReview && (
        <Box sx={{ mt: 2 }}>
          <PromotionValidationPanel
            readyCount={data.readyCount}
            reviewCount={data.reviewCount}
            issues={issueCandidates}
          />
        </Box>
      )}

      <PromotionRecordViewDrawer
        open={!!viewGroup}
        group={viewGroup ? recordsHook.groups.find((g) => g.id === viewGroup.id) ?? viewGroup : null}
        onClose={() => setViewGroup(null)}
      />

      <PromotionRecordEditDialog
        open={!!editGroup}
        group={activeEditGroup}
        students={data.students}
        busy={editBusy}
        onClose={() => setEditGroup(null)}
        onRemove={handleRemoveStudent}
        onAdd={handleAddStudent}
      />

      <PromotionRecordDeleteDialog
        open={!!deleteGroup}
        group={deleteGroup}
        deleting={deleting}
        onClose={() => setDeleteGroup(null)}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
}
