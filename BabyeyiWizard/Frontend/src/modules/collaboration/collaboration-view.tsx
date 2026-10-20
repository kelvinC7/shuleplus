'use client';

import { useEffect, useState } from 'react';
import { Users, Activity } from 'lucide-react';
import { fetchCollaboration } from '@/services/babyeyi-api';

export function CollaborationView() {
  const [data, setData] = useState<{ collaborators: Array<{ userName: string; role: string; isEditing: boolean }>; activities: Array<{ description: string; actorName?: string; createdAt: string }> } | null>(null);

  useEffect(() => {
    void fetchCollaboration().then(setData);
  }, []);

  const editors = [
    { name: 'Head Teacher', role: 'Head Teacher', editing: true },
    { name: 'Secretary', role: 'Secretary', editing: false },
    { name: 'Accountant', role: 'Accountant', editing: false },
    { name: 'Principal', role: 'Principal', editing: false },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="hr-card p-5">
        <h3 className="flex items-center gap-2 font-bold text-navy"><Users size={18} /> Currently Editing</h3>
        <div className="mt-4 space-y-3">
          {editors.map((e) => (
            <div key={e.name} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="font-semibold text-navy">{e.name}</p>
                <p className="text-xs text-muted">{e.role}</p>
              </div>
              {e.editing && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-navy">Editing</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="hr-card p-5">
        <h3 className="flex items-center gap-2 font-bold text-navy"><Activity size={18} /> Activity Feed</h3>
        <div className="mt-4 space-y-3">
          {(data?.activities ?? []).map((a, i) => (
            <div key={i} className="border-l-2 border-primary pl-3">
              <p className="text-sm text-navy">{a.description}</p>
              <p className="text-xs text-muted">{a.actorName} · {new Date(a.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
