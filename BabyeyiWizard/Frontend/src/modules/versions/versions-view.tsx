'use client';

import { useEffect, useState } from 'react';
import { History, RotateCcw, GitCompare } from 'lucide-react';
import { useToast } from '@/shared/notifications';
import { fetchCirculars, fetchVersions, restoreVersion } from '@/services/babyeyi-api';

export function VersionsView() {
  const toast = useToast();
  const [circularId, setCircularId] = useState('');
  const [circulars, setCirculars] = useState<Array<{ id: string; className: string }>>([]);
  const [versions, setVersions] = useState<Array<{ id: string; version: number; changeType: string; changedByName?: string; createdAt: string }>>([]);

  useEffect(() => {
    void fetchCirculars().then((list) => setCirculars(list.map((c) => ({ id: c.id, className: c.className }))));
  }, []);

  useEffect(() => {
    if (!circularId) return;
    void fetchVersions(circularId).then(setVersions);
  }, [circularId]);

  async function handleRestore(versionId: string) {
    if (!circularId) return;
    try {
      await restoreVersion(circularId, versionId);
      toast.success('Version restored');
      void fetchVersions(circularId).then(setVersions);
    } catch {
      toast.error('Restore failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="hr-card p-4">
        <label className="text-xs font-semibold text-navy">Select Circular</label>
        <select className="input mt-1 max-w-md" value={circularId} onChange={(e) => setCircularId(e.target.value)}>
          <option value="">Choose…</option>
          {circulars.map((c) => <option key={c.id} value={c.id}>{c.className}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {versions.map((v) => (
          <article key={v.id} className="hr-card flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10">
                <History size={20} className="text-navy" />
              </span>
              <div>
                <h3 className="font-bold text-navy">Version {v.version}</h3>
                <p className="text-sm text-muted capitalize">{v.changeType} by {v.changedByName ?? '—'}</p>
                <p className="text-xs text-muted">{new Date(v.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleRestore(v.id)} className="btn-secondary text-xs"><RotateCcw size={14} /> Restore</button>
              <button type="button" className="btn-secondary text-xs"><GitCompare size={14} /> Compare</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
