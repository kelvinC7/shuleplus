import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { App, ModuleLayout } from '@/App';
import IndexRedirect from '@/components/index-redirect';
import PublicOrderPage from '@/pages/PublicOrderPage';
import PublicOrderStatusPage from '@/pages/PublicOrderStatusPage';
import ShuleKitIndex from '@/pages/shulekit';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <IndexRedirect /> },
      { path: 'order', element: <PublicOrderPage /> },
      { path: 'order/status', element: <PublicOrderStatusPage /> },
      {
        element: <ModuleLayout />,
        children: [
          { path: 'home', element: <ShuleKitIndex /> },
          { path: 'kits/*', element: <Navigate to="/home?tab=Kits" replace /> },
          { path: 'requests/*', element: <Navigate to="/home?tab=Orders" replace /> },
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
