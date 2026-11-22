import { Outlet } from 'react-router-dom';
import { TokenBootstrap } from '@/components/token-bootstrap';
import { ToastProvider } from '@/components/ui/toast-provider';

export function App() {
  return (
    <ToastProvider>
      <TokenBootstrap />
      <Outlet />
    </ToastProvider>
  );
}
