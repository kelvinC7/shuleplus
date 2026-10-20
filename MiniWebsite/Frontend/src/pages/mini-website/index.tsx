import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import { MiniWebsiteLayout } from './layout';
import { Overview } from './modules/overview';
import { WebsiteEditor } from './modules/website';
import { ApplicantsModule, ApplicantDetail } from './modules/applicants';
import { SettingsModule } from './modules/settings';
import { getDashboard, getWebsite, listApplicants } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import type { Applicant, SchoolWebsite } from '@/types';

export default function MiniWebsiteIndex() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams, setSearchParams] = useSearchParams();
  const { summary } = useAuth();

  const tab = searchParams.get('tab') ?? 'Overview';
  const applicantId = searchParams.get('applicant_id');

  const [website, setWebsite] = useState<SchoolWebsite | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicantStatus, setApplicantStatus] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    activity: true,
    applicantStatus: false,
  });

  useEffect(() => {
    Promise.all([getDashboard(), getWebsite(), listApplicants()])
      .then(([, w, a]) => {
        setWebsite(w);
        setApplicants(a);
      })
      .catch((err: unknown) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to load data'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  };

  const handleTabChange = (t: string) =>
    updateParams({ tab: t, applicant_id: null });

  const openApplicant = (id: string) => updateParams({ tab: 'Applicants', applicant_id: id });
  const closeApplicant = () => updateParams({ applicant_id: null });

  const filterApplicants = (status: string) => {
    setApplicantStatus(status);
    handleTabChange('Applicants');
  };

  const refreshWebsite = async () => {
    try {
      const w = await getWebsite();
      setWebsite(w);
    } catch {
      // keep existing data on failure
    }
  };

  const refreshApplicants = async () => {
    try {
      const a = await listApplicants();
      setApplicants(a);
    } catch {
      // keep existing data on failure
    }
  };

  const refreshApplicant = (updated: Applicant) => {
    setApplicants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const toggleCollapse = (section: string) =>
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));

  const renderContent = () => {
    if (tab === 'Overview') {
      return (
        <Overview
          summary={summary}
          website={website}
          applicants={applicants}
          loading={loading}
          error={error}
          onEditWebsite={() => handleTabChange('Website')}
          onViewApplicants={() => handleTabChange('Applicants')}
          onFilterApplicants={filterApplicants}
          onRefresh={refreshWebsite}
        />
      );
    }
    if (tab === 'Website') {
      return (
        <WebsiteEditor
          website={website}
          loading={loading}
          error={error}
          onSaved={refreshWebsite}
        />
      );
    }
    if (tab === 'Applicants') {
      if (applicantId) {
        return (
          <ApplicantDetail
            applicant={applicants.find((a) => a.id === applicantId) ?? null}
            onBack={closeApplicant}
            onUpdated={refreshApplicant}
            onRefresh={refreshApplicants}
          />
        );
      }
      return (
        <ApplicantsModule
          applicants={applicants}
          loading={loading}
          error={error}
          status={applicantStatus}
          onStatusChange={setApplicantStatus}
          onOpen={openApplicant}
          onRefresh={refreshApplicants}
        />
      );
    }
    if (tab === 'Settings') {
      return (
        <SettingsModule
          website={website}
          loading={loading}
          error={error}
          onSaved={refreshWebsite}
        />
      );
    }
    return null;
  };

  return (
    <MiniWebsiteLayout
      activeTab={tab}
      onTabChange={handleTabChange}
      isMobile={isMobile}
      loading={loading}
      collapsed={collapsed}
      toggleCollapse={toggleCollapse}
      applicants={applicants}
      website={website}
      onEditWebsite={() => handleTabChange('Website')}
      onViewApplicants={() => handleTabChange('Applicants')}
      onSelectStatus={filterApplicants}
      hideSidebar={tab === 'Website'}
    >
      {renderContent()}
    </MiniWebsiteLayout>
  );
}
