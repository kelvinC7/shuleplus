import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { App, ModuleLayout } from '@/App';
import CommandDashboardPage from '@/pages/CommandDashboardPage';
import MorningSituationPage from '@/pages/MorningSituationPage';
import SchoolsPage from '@/pages/SchoolsPage';
import SchoolProfilePage from '@/pages/SchoolProfilePage';
import StudentAttendancePage from '@/pages/StudentAttendancePage';
import StaffAttendancePage from '@/pages/StaffAttendancePage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import AttentionPage from '@/pages/AttentionPage';
import DeviceHealthPage from '@/pages/DeviceHealthPage';
import DataQualityPage from '@/pages/DataQualityPage';
import SectorMapPage from '@/pages/SectorMapPage';
import FollowUpCasesPage from '@/pages/FollowUpCasesPage';
import SchoolVisitsPage from '@/pages/SchoolVisitsPage';
import IntegrityPage from '@/pages/IntegrityPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import SectorsOverviewPage from '@/pages/SectorsOverviewPage';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        element: <ModuleLayout />,
        children: [
          { path: 'dashboard', element: <CommandDashboardPage /> },
          { path: 'morning', element: <MorningSituationPage /> },
          { path: 'sectors', element: <SectorsOverviewPage /> },
          { path: 'schools', element: <SchoolsPage /> },
          { path: 'schools/:schoolId', element: <SchoolProfilePage /> },
          { path: 'students', element: <StudentAttendancePage /> },
          { path: 'staff', element: <StaffAttendancePage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'attention', element: <AttentionPage /> },
          { path: 'devices', element: <DeviceHealthPage /> },
          { path: 'data-quality', element: <DataQualityPage /> },
          { path: 'map', element: <SectorMapPage /> },
          { path: 'follow-up', element: <FollowUpCasesPage /> },
          { path: 'visits', element: <SchoolVisitsPage /> },
          { path: 'integrity', element: <IntegrityPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
