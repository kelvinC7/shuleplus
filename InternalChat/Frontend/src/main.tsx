import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { App, ModuleLayout } from '@/App';
import LandingPage from '@/pages/landing';
import ChatPage from '@/pages/chat';
import AdminPage from '@/pages/admin';
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
          { path: 'chat', element: <ChatPage /> },
          { path: 'admin', element: <AdminPage /> },
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
