import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { App, ModuleLayout } from '@/App';
import LandingPage from '@/pages/landing';
import SmsLayout from '@/layouts/sms-layout';
import SmsCenterPage from '@/pages/sms';
import SmsHistoryPage from '@/pages/sms/history';
import SmsUsagePage from '@/pages/sms/usage';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'landing', element: <LandingPage /> },
      {
        element: <ModuleLayout />,
        children: [
          { path: 'dashboard', element: <Navigate to="/sms" replace /> },
          { path: 'chat', element: <Navigate to="/sms" replace /> },
          { path: 'admin', element: <Navigate to="/sms" replace /> },
          {
            path: 'sms',
            element: <SmsLayout />,
            children: [
              { index: true, element: <SmsCenterPage /> },
              { path: 'history', element: <SmsHistoryPage /> },
              { path: 'usage', element: <SmsUsagePage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
