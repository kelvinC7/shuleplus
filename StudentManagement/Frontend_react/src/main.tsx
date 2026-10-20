import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { App, ModuleLayout } from '@/App';
import DashboardPage from '@/pages/DashboardPage';
import SettingsPage from '@/pages/SettingsPage';
import StudentsPage from '@/pages/StudentsPage';
import StudentReportsPage from '@/pages/StudentReportsPage';
import MissingInformationPage from '@/pages/MissingInformationPage';
import NewStudentPage from '@/pages/NewStudentPage';
import EditStudentPage from '@/pages/EditStudentPage';
import StudentProfilePage from '@/pages/StudentProfilePage';
import PromotionPage from '@/pages/PromotionPage';
import ClassesPage from '@/pages/ClassesPage';
import NewClassPage from '@/pages/NewClassPage';
import EditClassPage from '@/pages/EditClassPage';
import ClassHeadTeachersPage from '@/pages/ClassHeadTeachersPage';
import ClassMonitorsPage from '@/pages/ClassMonitorsPage';
import DeveloperApiDocsPage from '@/pages/developer/DeveloperApiDocsPage';
import './index.css';

const router = createBrowserRouter([
  { path: '/developer/api', element: <DeveloperApiDocsPage /> },
  { path: '/developer/api/*', element: <DeveloperApiDocsPage /> },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'home', element: <Navigate to="/dashboard" replace /> },
      {
        element: <ModuleLayout />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'students/reports/missing-information', element: <MissingInformationPage /> },
          { path: 'students/reports', element: <StudentReportsPage /> },
          { path: 'students/new', element: <NewStudentPage /> },
          { path: 'students/:id/edit', element: <EditStudentPage /> },
          { path: 'students/:id', element: <StudentProfilePage /> },
          { path: 'students/promotion', element: <PromotionPage /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'classes/new', element: <NewClassPage /> },
          { path: 'classes/:id/edit', element: <EditClassPage /> },
          { path: 'classes/head-teachers', element: <ClassHeadTeachersPage /> },
          { path: 'classes/monitors', element: <ClassMonitorsPage /> },
          { path: 'classes', element: <ClassesPage /> },
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
