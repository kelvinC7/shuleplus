'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Shield, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  type DataScope,
  type LicensedModule,
  type ModuleAccessLevel,
  type OrgUser,
  type UserStatus,
  orgAdminApi,
} from '@/lib/org-admin-api';

type AssignmentDraft = {
  slug: string;
  accessLevel: ModuleAccessLevel;
  dataScope: DataScope;
};

interface ManageUserModulesSheetProps {
  user: OrgUser | null;
  modules: LicensedModule[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
  onRequestResetPassword?: () => void;
}

export function ManageUserModulesSheet({
  user,
  modules,
  open,
  onOpenChange,
  onSaved,
  onError,
  onRequestResetPassword,
}: ManageUserModulesSheetProps) {
  const [assignments, setAssignments] = useState<AssignmentDraft[]>([]);
  const [accountActive, setAccountActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const isOrgAdmin = Boolean(user?.roles.includes('organization_admin'));

  useEffect(() => {
    if (!user || !open) return;
    setAssignments(
      user.modules.map((m) => ({
        slug: m.slug,
        accessLevel: m.accessLevel,
        dataScope: m.dataScope,
      }))
    );
    setAccountActive(user.status === 'ACTIVE');
  }, [user, open]);

  const assignedCount = assignments.length;
  const licensedCount = modules.length;

  const moduleLookup = useMemo(() => {
    const map = new Map(modules.map((m) => [m.slug, m]));
    return map;
  }, [modules]);

  function toggleModule(slug: string, enabled: boolean) {
    setAssignments((prev) => {
      if (!enabled) return prev.filter((a) => a.slug !== slug);
      if (prev.some((a) => a.slug === slug)) return prev;
      return [...prev, { slug, accessLevel: 'USER', dataScope: 'SELF' }];
    });
  }

  function patchAssignment(slug: string, patch: Partial<AssignmentDraft>) {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.slug !== slug) return a;
        const next = { ...a, ...patch };
        if (patch.accessLevel === 'HEAD' && !patch.dataScope) next.dataScope = 'ORGANIZATION';
        if (patch.accessLevel === 'USER' && !patch.dataScope) next.dataScope = 'SELF';
        return next;
      })
    );
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      if (!isOrgAdmin) {
        await orgAdminApi.setUserModules(user.id, {
          moduleAssignments: assignments.map((a) => ({
            slug: a.slug,
            accessLevel: a.accessLevel,
            dataScope: a.dataScope,
          })),
        });
      }

      const nextStatus: UserStatus = accountActive ? 'ACTIVE' : 'SUSPENDED';
      if (!isOrgAdmin && user.status !== nextStatus) {
        await orgAdminApi.updateStatus(user.id, nextStatus);
      }

      onSaved(
        isOrgAdmin
          ? `Account settings updated for ${user.firstName} ${user.lastName}.`
          : `Modules and access updated for ${user.firstName} ${user.lastName}.`
      );
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update user access';
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-navy">
            <UserCog className="size-4 text-primary" />
            Manage modules & access
          </SheetTitle>
          <SheetDescription>
            {user
              ? `${user.firstName} ${user.lastName} · ${user.email}`
              : 'Select a user to manage module access.'}
          </SheetDescription>
        </SheetHeader>

        {user ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="space-y-5 overflow-y-auto px-5 py-4">
              <section className="rounded-xl border border-border bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      Login account
                    </p>
                    <p className="mt-1 text-sm font-medium text-navy">
                      {accountActive ? 'Active — can sign in' : 'Suspended — login blocked'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Placement: {[user.department, user.position].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <Badge variant={accountActive ? 'default' : 'destructive'}>
                    {accountActive ? 'ACTIVE' : 'SUSPENDED'}
                  </Badge>
                </div>
                {!isOrgAdmin ? (
                  <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
                    <span className="text-sm text-navy">Allow login access</span>
                    <Switch
                      checked={accountActive}
                      onCheckedChange={(checked) => setAccountActive(Boolean(checked))}
                    />
                  </label>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Organization admins keep full login access. Status cannot be changed here.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onRequestResetPassword?.()}
                >
                  <KeyRound className="size-3.5" />
                  Set / reset password
                </Button>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-navy">Modules</p>
                    <p className="text-xs text-muted-foreground">
                      Add or remove licensed modules, then set Head/User and data scope.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isOrgAdmin ? 'All' : `${assignedCount}/${licensedCount}`}
                  </span>
                </div>

                {isOrgAdmin ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-navy">
                    This user is an Organization Admin and already has access to every licensed module.
                  </div>
                ) : modules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    No licensed modules yet. Enroll modules from the organization home.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {modules.map((mod) => {
                      const assigned = assignments.find((a) => a.slug === mod.slug);
                      return (
                        <div
                          key={mod.slug}
                          className={`rounded-xl border p-4 transition ${
                            assigned
                              ? 'border-primary/35 bg-white shadow-sm'
                              : 'border-border bg-white/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex min-w-0 cursor-pointer items-start gap-3">
                              <Checkbox
                                checked={Boolean(assigned)}
                                onCheckedChange={(checked) =>
                                  toggleModule(mod.slug, Boolean(checked))
                                }
                              />
                              <span className="min-w-0">
                                <span className="block font-medium text-navy">
                                  {mod.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {mod.shortName || mod.slug}
                                </span>
                              </span>
                            </label>
                            <Switch
                              checked={Boolean(assigned)}
                              onCheckedChange={(checked) =>
                                toggleModule(mod.slug, Boolean(checked))
                              }
                              aria-label={`Toggle ${mod.name}`}
                            />
                          </div>

                          {assigned ? (
                            <div className="mt-3 space-y-3 border-t border-border pt-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchAssignment(mod.slug, { accessLevel: 'USER' })
                                  }
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                    assigned.accessLevel === 'USER'
                                      ? 'bg-navy text-white'
                                      : 'bg-muted text-muted-foreground hover:bg-slate-200'
                                  }`}
                                >
                                  Module user
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchAssignment(mod.slug, { accessLevel: 'HEAD' })
                                  }
                                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                    assigned.accessLevel === 'HEAD'
                                      ? 'bg-primary text-navy'
                                      : 'bg-muted text-muted-foreground hover:bg-slate-200'
                                  }`}
                                >
                                  <Shield className="size-3.5" />
                                  Head of module
                                </button>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                  Data scope / visibility
                                </label>
                                <select
                                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                  value={assigned.dataScope}
                                  onChange={(e) =>
                                    patchAssignment(mod.slug, {
                                      dataScope: e.target.value as DataScope,
                                    })
                                  }
                                >
                                  <option value="SELF">Own records</option>
                                  <option value="DEPARTMENT">Department</option>
                                  <option value="BRANCH">Branch</option>
                                  <option value="ORGANIZATION">Entire organization</option>
                                </select>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {assigned.accessLevel === 'HEAD'
                                  ? `Head can manage and view work across ${moduleLookup.get(mod.slug)?.name ?? mod.slug}.`
                                  : 'User can open this module and work within the selected data scope.'}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              Off — this module is not assigned. Turn on to grant login access to it.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <SheetFooter className="border-t border-border bg-white">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
