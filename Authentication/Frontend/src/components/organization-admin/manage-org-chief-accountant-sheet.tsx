'use client';

import { useEffect, useMemo, useState } from 'react';
import { Scale, Shield } from 'lucide-react';
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
  buildPermissionsFromScope,
  CA_PLATFORM_FINANCE_AREAS,
  licensedCaProductModules,
  mergeScopeFromRow,
  type CaModuleScope,
  type CaOrgModuleDefinition,
} from '@/lib/ca-org-module-catalog';
import { orgAdminApi, type LicensedModule, type OrgChiefAccountantRow } from '@/lib/org-admin-api';

type Props = {
  row: OrgChiefAccountantRow | null;
  licensedModules: LicensedModule[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (rows: OrgChiefAccountantRow[]) => void;
  onError: (message: string) => void;
};

function ModuleCard({
  def,
  licensedName,
  entry,
  onChange,
}: {
  def: CaOrgModuleDefinition;
  licensedName?: string;
  entry: CaModuleScope[string];
  onChange: (next: CaModuleScope[string]) => void;
}) {
  const enabled = entry?.enabled ?? false;

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        enabled ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-navy">{licensedName ?? def.label}</p>
          {def.productHint ? <p className="text-xs text-slate-500">{def.productHint}</p> : null}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => onChange({ ...entry, enabled: Boolean(checked) })}
        />
      </div>

      {enabled ? (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Access level
            </label>
            <select
              className="input w-full text-sm"
              value={entry.level}
              onChange={(e) => onChange({ ...entry, level: e.target.value })}
            >
              {def.levelOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Activities</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {def.activities.map((act) => {
                const checked = entry.activities.includes(act.id);
                return (
                  <li key={act.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm hover:border-primary/30">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const activities = v
                            ? [...entry.activities, act.id]
                            : entry.activities.filter((id) => id !== act.id);
                          onChange({ ...entry, activities });
                        }}
                        className="mt-0.5"
                      />
                      <span className="text-navy">{act.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ManageOrgChiefAccountantSheet({
  row,
  licensedModules,
  open,
  onOpenChange,
  onSaved,
  onError,
}: Props) {
  const productDefs = useMemo(() => licensedCaProductModules(licensedModules), [licensedModules]);
  const allDefs = useMemo(() => [...productDefs, ...CA_PLATFORM_FINANCE_AREAS], [productDefs]);

  const licensedLookup = useMemo(
    () => new Map(licensedModules.map((m) => [m.slug, m])),
    [licensedModules]
  );

  const [scope, setScope] = useState<CaModuleScope>({});
  const [statusActive, setStatusActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row || !open) return;
    setScope(mergeScopeFromRow(row.permissions, allDefs));
    setStatusActive(row.status === 'ACTIVE');
  }, [row, open, allDefs]);

  function patchScope(slug: string, entry: CaModuleScope[string]) {
    setScope((s) => ({ ...s, [slug]: entry }));
  }

  async function handleSave() {
    if (!row) return;
    setSaving(true);
    try {
      const enabledDefs = allDefs.filter((d) => scope[d.slug]?.enabled);
      for (const d of enabledDefs) {
        if (!scope[d.slug]?.activities?.length) {
          onError(`Select at least one activity for ${d.label}.`);
          setSaving(false);
          return;
        }
      }

      const permissionLevels = buildPermissionsFromScope(scope, allDefs);
      const { data } = await orgAdminApi.updateChiefAccountantAssignment(row.userId, {
        permissions: {
          ...permissionLevels,
          moduleScope: scope,
        },
        status: statusActive ? 'ACTIVE' : 'SUSPENDED',
      });
      onSaved(data.data);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save';
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = allDefs.filter((d) => scope[d.slug]?.enabled).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-navy">
            <Scale className="size-4 text-amber-600" />
            Chief Accountant modules
          </SheetTitle>
          <SheetDescription>
            {row ? `${row.user.firstName} ${row.user.lastName} · ${row.user.email}` : ''}
          </SheetDescription>
        </SheetHeader>

        {row ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="space-y-5 overflow-y-auto px-5 py-4">
              <section className="rounded-xl border border-border bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      School access
                    </p>
                    <p className="mt-1 text-sm font-medium text-navy">
                      {statusActive ? 'Active for this school' : 'Suspended for this school'}
                    </p>
                  </div>
                  <Badge variant={statusActive ? 'default' : 'destructive'}>
                    {statusActive ? 'ACTIVE' : 'SUSPENDED'}
                  </Badge>
                </div>
                <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
                  <span className="text-sm text-navy">Allow access to this school</span>
                  <Switch checked={statusActive} onCheckedChange={(c) => setStatusActive(Boolean(c))} />
                </label>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <Shield className="size-3.5" />
                  Account removal: Super Admin or School Representative only
                </p>
              </section>

              {productDefs.length ? (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy">Licensed school modules</p>
                    <span className="text-xs text-slate-500">{productDefs.length} available</span>
                  </div>
                  <div className="space-y-3">
                    {productDefs.map((def) => (
                      <ModuleCard
                        key={def.slug}
                        def={def}
                        licensedName={licensedLookup.get(def.slug)?.name}
                        entry={
                          scope[def.slug] ?? {
                            enabled: false,
                            level: def.levelOptions[0]?.value ?? 'view',
                            activities: [],
                          }
                        }
                        onChange={(e) => patchScope(def.slug, e)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy">Finance workspace</p>
                  <span className="text-xs text-slate-500">{enabledCount} enabled</span>
                </div>
                <div className="space-y-3">
                  {CA_PLATFORM_FINANCE_AREAS.map((def) => (
                    <ModuleCard
                      key={def.slug}
                      def={def}
                      entry={
                        scope[def.slug] ?? {
                          enabled: false,
                          level: def.levelOptions[0]?.value ?? 'view',
                          activities: [],
                        }
                      }
                      onChange={(e) => patchScope(def.slug, e)}
                    />
                  ))}
                </div>
              </section>
            </div>

            <SheetFooter className="border-t border-border px-5 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving…' : 'Save access'}
              </Button>
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
