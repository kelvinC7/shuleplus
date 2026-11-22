import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from '@/App';
import WelcomePage from '@/pages/WelcomePage';
import LoginPage from '@/pages/LoginPage';
import SchoolRegisterWizardPage from '@/pages/SchoolRegisterWizardPage';
import RegisterConfirmationPage from '@/pages/RegisterConfirmationPage';
import MarketingSubpage from '@/pages/MarketingSubpage';
import SuperAdminRegistrationsPage from '@/pages/SuperAdminRegistrationsPage';
import PublicTripVerifyPage from '@/pages/PublicTripVerifyPage';
import { IamHomeEntryRedirect, IamSchoolEntryRedirect } from '@/pages/IamEntryRedirect';
import { SchoolLayout } from '@/schools/layouts/school-layout';
import { GovernmentLayout } from '@/government/layouts/government-layout';
import SchoolDashboardPage from '@/schools/pages/SchoolDashboardPage';
import MyTripsPage from '@/schools/pages/MyTripsPage';
import TripCalendarPage from '@/schools/pages/TripCalendarPage';
import TripOperationsPage from '@/schools/pages/TripOperationsPage';
import RegisterTripWizardPage from '@/schools/pages/RegisterTripWizardPage';
import SchoolPlaceholderPage from '@/schools/pages/SchoolPlaceholderPage';
import ParticipantsStaffPage from '@/schools/pages/ParticipantsStaffPage';
import GuardianConsentPage from '@/schools/pages/GuardianConsentPage';
import SafetyCompliancePage from '@/schools/pages/SafetyCompliancePage';
import TripDocumentsPage from '@/schools/pages/TripDocumentsPage';
import TransportManagementPage from '@/schools/pages/TransportManagementPage';
import AuthorizationsPage from '@/schools/pages/AuthorizationsPage';
import TripApprovalLetterPage from '@/schools/pages/TripApprovalLetterPage';
import GovTripApprovalLetterPage from '@/government/pages/GovTripApprovalLetterPage';
import SchoolNotificationsPage from '@/schools/pages/SchoolNotificationsPage';
import GovernmentOverviewPage from '@/government/pages/GovernmentOverviewPage';
import ReviewQueuePage from '@/government/pages/ReviewQueuePage';
import ApplicationReviewPage from '@/government/pages/ApplicationReviewPage';
import {
  AllApplicationsPage,
  ApplicationIntakePage,
  ApprovedTripsPage,
  EducationReviewPage,
  PendingDecisionsPage,
  TripMonitoringPage,
} from '@/government/pages/GovernmentApplicationsListPage';
import TransportSafetyPage from '@/government/pages/TransportSafetyPage';
import CheckpointInspectionPage from '@/government/pages/CheckpointInspectionPage';
import FinalApprovalPage from '@/government/pages/FinalApprovalPage';
import DocumentsEvidencePage from '@/government/pages/DocumentsEvidencePage';
import IncidentsAlertsPage from '@/government/pages/IncidentsAlertsPage';
import GovernmentReportsPage from '@/government/pages/GovernmentReportsPage';
import SchoolsRegistryPage from '@/government/pages/SchoolsRegistryPage';
import PoliciesPage from '@/government/pages/PoliciesPage';
import AuditLogsPage from '@/government/pages/AuditLogsPage';
import GovernmentSettingsPage from '@/government/pages/GovernmentSettingsPage';
import SuperAdminOverviewPage from '@/government/pages/admin/SuperAdminOverviewPage';
import GovernmentUsersPage from '@/government/pages/admin/GovernmentUsersPage';
import RolesPermissionsPage from '@/government/pages/admin/RolesPermissionsPage';
import AuthoritiesPage from '@/government/pages/admin/AuthoritiesPage';
import WorkflowBuilderPage from '@/government/pages/admin/WorkflowBuilderPage';
import AuditSecurityPage from '@/government/pages/admin/AuditSecurityPage';
import './index.css';

const schoolSectionRoutes = ['reports', 'settings'] as const;

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <WelcomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <SchoolRegisterWizardPage /> },
      { path: 'register/confirmation', element: <RegisterConfirmationPage /> },
      { path: 'superadmin/registrations', element: <SuperAdminRegistrationsPage /> },
      { path: 'about', element: <MarketingSubpage variant="about" /> },
      { path: 'features', element: <MarketingSubpage variant="features" /> },
      { path: 'contact', element: <MarketingSubpage variant="contact" /> },
      { path: 'trip/:reference', element: <PublicTripVerifyPage /> },
      { path: 'dashboard', element: <IamSchoolEntryRedirect /> },
      { path: 'home', element: <IamHomeEntryRedirect /> },
      {
        path: 'school',
        element: <SchoolLayout />,
        children: [
          { path: 'dashboard', element: <SchoolDashboardPage /> },
          { path: 'trips', element: <MyTripsPage /> },
          { path: 'trips/new', element: <RegisterTripWizardPage /> },
          { path: 'trips/:tripId/edit', element: <RegisterTripWizardPage /> },
          { path: 'calendar', element: <TripCalendarPage /> },
          { path: 'operations', element: <TripOperationsPage /> },
          { path: 'participants', element: <ParticipantsStaffPage /> },
          { path: 'consent', element: <GuardianConsentPage /> },
          { path: 'safety', element: <SafetyCompliancePage /> },
          { path: 'documents', element: <TripDocumentsPage /> },
          { path: 'transport', element: <TransportManagementPage /> },
          { path: 'authorizations', element: <AuthorizationsPage /> },
          { path: 'trips/:tripId/approval-letter', element: <TripApprovalLetterPage /> },
          { path: 'notifications', element: <SchoolNotificationsPage /> },
          ...schoolSectionRoutes.map((segment) => ({
            path: segment,
            element: <SchoolPlaceholderPage />,
          })),
        ],
      },
      {
        path: 'government',
        element: <GovernmentLayout />,
        children: [
          { path: 'overview', element: <GovernmentOverviewPage /> },
          { path: 'intake', element: <ApplicationIntakePage /> },
          { path: 'review-queue', element: <ReviewQueuePage /> },
          { path: 'review/:tripId', element: <ApplicationReviewPage /> },
          { path: 'review/:tripId/approval-letter', element: <GovTripApprovalLetterPage /> },
          { path: 'applications', element: <AllApplicationsPage /> },
          { path: 'pending', element: <PendingDecisionsPage /> },
          { path: 'education-review', element: <EducationReviewPage /> },
          { path: 'safety', element: <TransportSafetyPage /> },
          { path: 'checkpoint', element: <CheckpointInspectionPage /> },
          { path: 'final-approval', element: <FinalApprovalPage /> },
          { path: 'approved', element: <ApprovedTripsPage /> },
          { path: 'monitoring', element: <TripMonitoringPage /> },
          { path: 'incidents', element: <IncidentsAlertsPage /> },
          { path: 'documents', element: <DocumentsEvidencePage /> },
          { path: 'reports', element: <GovernmentReportsPage /> },
          { path: 'schools', element: <SchoolsRegistryPage /> },
          { path: 'policies', element: <PoliciesPage /> },
          { path: 'audit', element: <AuditLogsPage /> },
          { path: 'settings', element: <GovernmentSettingsPage /> },
          { path: 'admin/overview', element: <SuperAdminOverviewPage /> },
          { path: 'admin/users', element: <GovernmentUsersPage /> },
          { path: 'admin/roles', element: <RolesPermissionsPage /> },
          { path: 'admin/authorities', element: <AuthoritiesPage /> },
          { path: 'admin/workflow', element: <WorkflowBuilderPage /> },
          { path: 'admin/security', element: <AuditSecurityPage /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
