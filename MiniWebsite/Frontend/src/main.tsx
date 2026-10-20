import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { App, ModuleLayout } from '@/App';
import IndexRedirect from '@/components/index-redirect';
import MiniWebsiteIndex from '@/pages/mini-website';
import SchoolDirectory from '@/pages/public/school-directory';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <SchoolDirectory /> },
      { path: 'schools', element: <SchoolDirectory /> },
      { path: 'dashboard', element: <IndexRedirect /> },
      {
        element: <ModuleLayout />,
        children: [
          { path: 'home', element: <MiniWebsiteIndex /> },
          { path: 'overview/*', element: <Navigate to="/home?tab=Overview" replace /> },
          { path: 'website/*', element: <Navigate to="/home?tab=Website" replace /> },
          { path: 'applicants/*', element: <Navigate to="/home?tab=Applicants" replace /> },
          { path: 'settings/*', element: <Navigate to="/home?tab=Settings" replace /> },
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
