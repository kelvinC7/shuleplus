'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';

export default function ModulesPage() {
  const [modules, setModules] = useState<Array<{ id: string; name: string; isEnabled: boolean }>>([]);

  useEffect(() => {
    api.get('/root-admin/modules').then((res) => setModules(res.data.data));
  }, []);

  async function toggle(id: string, isEnabled: boolean) {
    await api.patch(`/root-admin/modules/${id}`, { isEnabled });
    const res = await api.get('/root-admin/modules');
    setModules(res.data.data);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <BackButton href="/root-admin" />
        <h1 className="font-montserrat text-2xl font-bold text-navy">Modules</h1>
      </div>
      <div className="space-y-3">
        {modules.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-2xl border border-border bg-white/90 p-5">
            <div>
              <p className="font-poppins-semibold text-navy">{m.name}</p>
              <p className="text-xs text-muted">{m.isEnabled ? '🟢 Enabled' : '🔴 Disabled'}</p>
            </div>
            <button type="button" onClick={() => toggle(m.id, !m.isEnabled)} className="rounded-lg bg-navy px-4 py-2 text-xs font-poppins-semibold text-primary">
              {m.isEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
