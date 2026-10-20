'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import { DEFAULT_TEAMS, getInitials, type PlatformAdmin } from '@/lib/platform-administrators';

interface Team {
  id: string;
  name: string;
  color: string;
  members: string[];
}

const STORAGE_KEY = 'shuleplus_platform_teams';

export default function PlatformTeamsPage() {
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTeams(JSON.parse(stored) as Team[]);
      } catch {
        /* use defaults */
      }
    }
    api.get('/root-admin/platform-administrators').then((res) => setAdmins(res.data.data));
  }, []);

  function saveTeams(updated: Team[]) {
    setTeams(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function toggleMember(teamId: string, adminId: string) {
    const updated = teams.map((t) => {
      if (t.id !== teamId) {
        return { ...t, members: t.members.filter((m) => m !== adminId) };
      }
      const has = t.members.includes(adminId);
      return {
        ...t,
        members: has ? t.members.filter((m) => m !== adminId) : [...t.members, adminId],
      };
    });
    saveTeams(updated);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackButton href="/root-admin/system-administrators" label="Back to Administrators" />
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-navy">Platform Teams</h1>
        <p className="text-sm text-muted">Assign administrators to teams for organized access management</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const memberAdmins = admins.filter((a) => team.members.includes(a.id));
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => setSelectedTeam(selectedTeam === team.id ? null : team.id)}
              className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md ${
                selectedTeam === team.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                <h3 className="font-poppins-semibold text-navy">{team.name}</h3>
              </div>
              <p className="text-sm text-muted">{memberAdmins.length} member{memberAdmins.length !== 1 ? 's' : ''}</p>
              <div className="mt-3 flex -space-x-2">
                {memberAdmins.slice(0, 5).map((a) => (
                  <span
                    key={a.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-navy text-[10px] font-poppins-bold text-primary"
                    title={`${a.firstName} ${a.lastName}`}
                  >
                    {getInitials(a.firstName, a.lastName)}
                  </span>
                ))}
                {memberAdmins.length > 5 && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-navy/10 text-[10px] text-navy">
                    +{memberAdmins.length - 5}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedTeam && (
        <div className="rounded-2xl border border-border bg-white p-6">
          <h2 className="mb-4 font-poppins-semibold text-navy">
            Assign to {teams.find((t) => t.id === selectedTeam)?.name}
          </h2>
          <div className="space-y-2">
            {admins.map((admin) => {
              const team = teams.find((t) => t.id === selectedTeam)!;
              const isMember = team.members.includes(admin.id);
              return (
                <label
                  key={admin.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 transition hover:bg-navy/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-poppins-bold text-primary">
                      {getInitials(admin.firstName, admin.lastName)}
                    </span>
                    <div>
                      <p className="font-poppins-medium text-sm text-navy">{admin.firstName} {admin.lastName}</p>
                      <p className="text-xs text-muted">{admin.email}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMember}
                    onChange={() => toggleMember(selectedTeam, admin.id)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
