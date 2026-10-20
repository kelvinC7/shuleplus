import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import { ShuleKitLayout } from './layout';
import { Overview } from './modules/overview';
import { KitsModule, KitDetail, KitForm } from './modules/kits';
import { OrdersModule, OrderDetail, OrderForm } from './modules/orders';
import { deleteKit, listKits, listRequests } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import type { Kit, KitRequest } from '@/types';

export default function ShuleKitIndex() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams, setSearchParams] = useSearchParams();
  const { summary } = useAuth();

  const tab = searchParams.get('tab') ?? 'Overview';
  const kitId = searchParams.get('id');
  const view = searchParams.get('view');
  const reqId = searchParams.get('req_id');

  const [kits, setKits] = useState<Kit[]>([]);
  const [requests, setRequests] = useState<KitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    activity: true,
    orderStatus: false,
  });

  useEffect(() => {
    Promise.all([listKits(), listRequests()])
      .then(([k, r]) => {
        setKits(k);
        setRequests(r.requests);
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
    updateParams({ tab: t, id: null, view: null, req_id: null });

  const openKit = (id: string) => updateParams({ tab: 'Kits', id, view: null });
  const openKitNew = () => updateParams({ tab: 'Kits', id: null, view: 'new' });
  const openKitEdit = (id: string) => updateParams({ tab: 'Kits', id, view: 'edit' });
  const closeKit = () => updateParams({ id: null, view: null });

  const openRequest = (id: string) => updateParams({ tab: 'Orders', req_id: id, view: null });
  const openRequestNew = () => updateParams({ tab: 'Orders', req_id: null, view: 'new' });
  const closeRequest = () => updateParams({ req_id: null, view: null });

  const filterOrders = (status: string) => {
    setOrderStatus(status);
    handleTabChange('Orders');
  };

  const handleDeleteKit = async (id: string) => {
    await deleteKit(id);
    setKits((prev) => prev.filter((k) => k.id !== id));
  };

  const refreshKits = async () => {
    try {
      const k = await listKits();
      setKits(k);
    } catch {
      // keep existing data on failure
    }
  };

  const addRequest = (created: KitRequest) => {
    setRequests((prev) => [created, ...prev]);
  };

  const refreshRequest = (updated: KitRequest) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const toggleCollapse = (section: string) =>
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));

  const renderContent = () => {
    if (tab === 'Overview') {
      return (
        <Overview
          summary={summary}
          kits={kits}
          requests={requests}
          loading={loading}
          onOpenKits={() => handleTabChange('Kits')}
          onOpenOrders={() => handleTabChange('Orders')}
          onFilterOrders={filterOrders}
        />
      );
    }
    if (tab === 'Kits') {
      if (view === 'new') {
        return <KitForm onSaved={() => { refreshKits(); closeKit(); }} onCancel={closeKit} />;
      }
      if (kitId && view === 'edit') {
        return (
          <KitForm
            kitId={kitId}
            onSaved={() => { refreshKits(); closeKit(); }}
            onCancel={closeKit}
            onDeleted={closeKit}
          />
        );
      }
      if (kitId) {
        return (
          <KitDetail
            kitId={kitId}
            onBack={closeKit}
            onEdit={openKitEdit}
            onNewRequest={openRequestNew}
          />
        );
      }
      return (
        <KitsModule
          kits={kits}
          loading={loading}
          error={error}
          onOpen={openKit}
          onNew={openKitNew}
          onEdit={openKitEdit}
          onDelete={handleDeleteKit}
        />
      );
    }
    if (tab === 'Orders') {
      if (view === 'new') {
        return (
          <OrderForm
            onSaved={(created) => {
              addRequest(created);
              openRequest(created.id);
            }}
            onCancel={closeRequest}
          />
        );
      }
      if (reqId) {
        return <OrderDetail requestId={reqId} onBack={closeRequest} onUpdated={refreshRequest} />;
      }
      return (
        <OrdersModule
          requests={requests}
          loading={loading}
          error={error}
          status={orderStatus}
          onStatusChange={setOrderStatus}
          onOpen={openRequest}
          onNew={openRequestNew}
        />
      );
    }
    return null;
  };

  return (
    <ShuleKitLayout
      activeTab={tab}
      onTabChange={handleTabChange}
      isMobile={isMobile}
      loading={loading}
      collapsed={collapsed}
      toggleCollapse={toggleCollapse}
      kits={kits}
      requests={requests}
      onNewKit={openKitNew}
      onNewRequest={openRequestNew}
      onSelectStatus={filterOrders}
    >
      {renderContent()}
    </ShuleKitLayout>
  );
}
