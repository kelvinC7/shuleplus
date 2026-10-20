'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Building2,
  CheckCircle2,
  Copy,
  Globe,
  KeyRound,
  Link2,
  Mail,
  Pencil,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  activateDeveloperAdmin,
  approveProductionRequest,
  createDeveloperAccess,
  createDeveloperPartner,
  deleteDeveloper,
  fetchBankOnboardingEmail,
  fetchDeveloperPartners,
  fetchDeveloperPortalSettings,
  fetchDevelopersAdmin,
  fetchPermissionConfig,
  fetchProductionRequestsAdmin,
  linkPartnerSandbox,
  rejectProductionRequest,
  resendDeveloperActivation,
  suspendDeveloper,
  updateDeveloperAccess,
  updateDeveloperPortalSettings,
  type CreateDeveloperAccessInput,
  type DeveloperActivationDelivery,
  type DeveloperAdminRow,
  type DeveloperPartner,
  type DeveloperPortalSettings,
} from '@/lib/developer-api';
import { api } from '@/lib/api';
import { CreateDeveloperAccessModal, type CreateAccessFormState } from './create-developer-access-modal';

export function DeveloperAccessView() {
  const [developers, setDevelopers] = useState<DeveloperAdminRow[]>([]);
  const [partners, setPartners] = useState<DeveloperPartner[]>([]);
  const [permissionConfig, setPermissionConfig] = useState<
    Record<string, { label: string; permissions: { key: string; label: string }[] }>
  >({});
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<DeveloperAdminRow | null>(null);
  const [showPartner, setShowPartner] = useState(false);
  const [activationResult, setActivationResult] = useState<{
    url: string;
    email: string;
    emailSent?: boolean;
    emailDelivery?: DeveloperActivationDelivery;
  } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyingPartnerId, setCopyingPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerOrganizationId, setPartnerOrganizationId] = useState('');
  const [schoolOrganizations, setSchoolOrganizations] = useState<
    { id: string; name: string; organizationCode?: string | null }[]
  >([]);
  const [linkPartnerId, setLinkPartnerId] = useState<string | null>(null);
  const [linkOrganizationId, setLinkOrganizationId] = useState('');
  const [linkMsg, setLinkMsg] = useState('');
  const [productionRequests, setProductionRequests] = useState<
    { id: string; status: string; businessJustification?: string; partner: { name: string }; createdAt: string }[]
  >([]);
  const [tab, setTab] = useState<'developers' | 'production'>('developers');

  const [form, setForm] = useState<CreateAccessFormState>({
    partnerId: '',
    firstName: '',
    lastName: '',
    email: '',
    accessType: 'DEVELOPER' as CreateDeveloperAccessInput['accessType'],
    sandbox: true,
    production: false,
    restrictIp: false,
    allowedModules: {} as Record<string, Record<string, boolean>>,
  });

  const [loadError, setLoadError] = useState('');
  const [partnerError, setPartnerError] = useState('');
  const [createAccessError, setCreateAccessError] = useState('');
  const [editAccessError, setEditAccessError] = useState('');
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [portalSettings, setPortalSettings] = useState<DeveloperPortalSettings | null>(null);
  const [portalUrlInput, setPortalUrlInput] = useState('');
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalMsg, setPortalMsg] = useState('');
  const [portalError, setPortalError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    const results = await Promise.allSettled([
      fetchDevelopersAdmin(search || undefined),
      fetchDeveloperPartners(),
      fetchPermissionConfig(),
      fetchProductionRequestsAdmin('PENDING'),
      fetchDeveloperPortalSettings(),
    ]);

    const [devsR, ptsR, cfgR, prodR, portalR] = results;
    if (devsR.status === 'fulfilled') setDevelopers(devsR.value);
    if (ptsR.status === 'fulfilled') {
      setPartners(ptsR.value);
      if (ptsR.value[0] && !form.partnerId) setForm((f) => ({ ...f, partnerId: ptsR.value[0]!.id }));
    }
    if (cfgR.status === 'fulfilled') setPermissionConfig(cfgR.value);
    if (prodR.status === 'fulfilled') setProductionRequests(prodR.value);
    if (portalR.status === 'fulfilled') {
      setPortalSettings(portalR.value);
      setPortalUrlInput(portalR.value.publicApiUrl ?? portalR.value.resolvedPublicApiUrl);
    }

    api.get('/super-admin/organizations').then((res) => {
      const rows = (res.data.data ?? []) as { id: string; name: string; organizationCode?: string | null }[];
      setSchoolOrganizations(rows);
    }).catch(() => {});

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      setLoadError('Some developer access data failed to load. Refresh or check the IAM backend logs.');
    }
  }, [search, form.partnerId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  function togglePermission(moduleKey: string, permKey: string) {
    setForm((f) => {
      const mods = { ...f.allowedModules };
      const mod = { ...(mods[moduleKey] ?? {}) };
      mod[permKey] = !mod[permKey];
      mods[moduleKey] = mod;
      return { ...f, allowedModules: mods };
    });
  }

  function toggleModule(moduleKey: string, enabled: boolean) {
    setForm((f) => {
      const mods = { ...f.allowedModules };
      if (!enabled) {
        delete mods[moduleKey];
      } else {
        const cfg = permissionConfig[moduleKey];
        if (cfg) {
          mods[moduleKey] = Object.fromEntries(cfg.permissions.map((p) => [p.key, false]));
        }
      }
      return { ...f, allowedModules: mods };
    });
  }

  function selectAllModuleScopes(moduleKey: string) {
    const cfg = permissionConfig[moduleKey];
    if (!cfg) return;
    setForm((f) => ({
      ...f,
      allowedModules: {
        ...f.allowedModules,
        [moduleKey]: Object.fromEntries(cfg.permissions.map((p) => [p.key, true])),
      },
    }));
  }

  function deselectAllModuleScopes(moduleKey: string) {
    const cfg = permissionConfig[moduleKey];
    if (!cfg) return;
    setForm((f) => ({
      ...f,
      allowedModules: {
        ...f.allowedModules,
        [moduleKey]: Object.fromEntries(cfg.permissions.map((p) => [p.key, false])),
      },
    }));
  }

  function selectAllModules() {
    const mods: Record<string, Record<string, boolean>> = {};
    for (const [modKey, cfg] of Object.entries(permissionConfig)) {
      mods[modKey] = Object.fromEntries(cfg.permissions.map((p) => [p.key, true]));
    }
    setForm((f) => ({ ...f, allowedModules: mods }));
  }

  function deselectAllModules() {
    setForm((f) => ({ ...f, allowedModules: {} }));
  }

  async function handleCreatePartner(e: React.FormEvent) {
    e.preventDefault();
    setPartnerError('');
    if (!partnerOrganizationId) {
      setPartnerError('Select a sandbox school from this server.');
      return;
    }
    try {
      await createDeveloperPartner(
        partnerName,
        undefined,
        partnerOrganizationId || undefined
      );
      setPartnerName('');
      setPartnerOrganizationId('');
      setShowPartner(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPartnerError(msg ?? 'Failed to create partner. Check IAM backend logs.');
    }
  }

  async function handleLinkSandbox(e: React.FormEvent) {
    e.preventDefault();
    if (!linkPartnerId || !linkOrganizationId) return;
    setLinkMsg('');
    try {
      const result = await linkPartnerSandbox(linkPartnerId, linkOrganizationId);
      setLinkMsg(result.message);
      setLinkPartnerId(null);
      setLinkOrganizationId('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLinkMsg(msg ?? 'Failed to link sandbox organization.');
    }
  }

  function openEditDeveloper(developer: DeveloperAdminRow) {
    const envs = developer.allowedEnvironments ?? [];
    setForm({
      partnerId: developer.partner.id,
      firstName: developer.firstName,
      lastName: developer.lastName,
      email: developer.email,
      accessType: developer.accessType as CreateDeveloperAccessInput['accessType'],
      sandbox: envs.includes('SANDBOX'),
      production: envs.includes('PRODUCTION'),
      restrictIp: false,
      allowedModules: { ...(developer.allowedModules ?? {}) },
    });
    setEditAccessError('');
    setEditingDeveloper(developer);
  }

  function closeEditModal() {
    setEditingDeveloper(null);
    setEditAccessError('');
  }

  async function handleUpdateAccess(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDeveloper) return;
    setLoading(true);
    setEditAccessError('');
    setEditSuccessMsg('');
    try {
      const allowedEnvironments: ('SANDBOX' | 'PRODUCTION')[] = [];
      if (form.sandbox) allowedEnvironments.push('SANDBOX');
      if (form.production) allowedEnvironments.push('PRODUCTION');

      if (allowedEnvironments.length === 0) {
        setEditAccessError('Select at least one environment (Sandbox or Production).');
        return;
      }

      await updateDeveloperAccess(editingDeveloper.id, {
        accessType: form.accessType,
        allowedModules: form.allowedModules,
        allowedEnvironments,
      });

      setEditSuccessMsg(`Permissions updated for ${editingDeveloper.email}`);
      closeEditModal();
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditAccessError(msg ?? 'Failed to update developer permissions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAccess(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setCreateAccessError('');
    try {
      const selectedPartner = partners.find((p) => p.id === form.partnerId);
      if (form.sandbox && !selectedPartner?.sandboxOrganization?.id) {
        setCreateAccessError(
          'This partner has no sandbox school linked. Create the partner with a school selected, or use Link school on the partner card.'
        );
        return;
      }

      const allowedEnvironments: ('SANDBOX' | 'PRODUCTION')[] = [];
      if (form.sandbox) allowedEnvironments.push('SANDBOX');
      if (form.production) allowedEnvironments.push('PRODUCTION');

      if (allowedEnvironments.length === 0) {
        setCreateAccessError('Select at least one environment (Sandbox or Production).');
        return;
      }

      const result = await createDeveloperAccess({
        partnerId: form.partnerId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        accessType: form.accessType,
        allowedModules: form.allowedModules,
        allowedEnvironments,
      });

      setActivationResult({
        url: result.activationUrl,
        email: form.email,
        emailSent: result.emailSent,
        emailDelivery: result.emailDelivery,
      });
      setShowCreate(false);
      load();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 401) {
        setCreateAccessError('Session expired. Please sign in again as Super Admin.');
      } else {
        setCreateAccessError(msg ?? 'Failed to create developer access.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSuspend(id: string) {
    if (!confirm('Suspend this developer?')) return;
    await suspendDeveloper(id);
    load();
  }

  async function handleActivate(id: string) {
    await activateDeveloperAdmin(id);
    load();
  }

  async function handleDelete(developer: DeveloperAdminRow) {
    if (
      !confirm(
        `Permanently delete ${developer.firstName} ${developer.lastName} (${developer.email})? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(developer.id);
    try {
      await deleteDeveloper(developer.id);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Failed to delete developer.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopyBankOnboardingEmail(partner: DeveloperPartner) {
    setCopyingPartnerId(partner.id);
    try {
      const email = await fetchBankOnboardingEmail(partner.id);
      await navigator.clipboard.writeText(email.text);
      alert(`Bank onboarding guide copied (subject: ${email.subject}). Paste into your email to ${partner.name}.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Failed to load onboarding email template.');
    } finally {
      setCopyingPartnerId(null);
    }
  }

  async function copyActivationLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard may be blocked; user can still select from the code block.
    }
  }

  async function handleResendActivation(developer: DeveloperAdminRow) {
    setResendingId(developer.id);
    try {
      const result = await resendDeveloperActivation(developer.id);
      setActivationResult({
        url: result.activationUrl,
        email: result.email ?? developer.email,
        emailSent: result.emailSent,
        emailDelivery: result.emailDelivery,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Failed to resend activation email.');
    } finally {
      setResendingId(null);
    }
  }

  function activationDeliveryHint(delivery?: DeveloperActivationDelivery) {
    if (!delivery?.delivered) {
      return 'Email was not delivered — copy the activation link below and send it manually (check IAM backend console for [DEV EMAIL] in local dev).';
    }
    if (delivery.channel === 'smtp') {
      return 'Sent via IAM SMTP. If the inbox is empty, check spam or verify SMTP credentials in Authentication/Backend/.env.';
    }
    return 'Sent via Notification Service. If the inbox is empty, check spam or verify SMTP on the notification service.';
  }

  async function handleSavePortalSettings(e: React.FormEvent) {
    e.preventDefault();
    setPortalSaving(true);
    setPortalMsg('');
    setPortalError('');
    try {
      const trimmed = portalUrlInput.trim();
      const updated = await updateDeveloperPortalSettings(trimmed || null);
      setPortalSettings(updated);
      setPortalUrlInput(updated.publicApiUrl ?? updated.resolvedPublicApiUrl);
      setPortalMsg(
        trimmed
          ? 'Gateway URL saved. Test Lab, Postman, and API docs will use this automatically.'
          : 'Cleared custom URL — using environment fallback.'
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPortalError(msg ?? 'Failed to save gateway URL.');
    } finally {
      setPortalSaving(false);
    }
  }

  async function handleClearPortalSettings() {
    setPortalSaving(true);
    setPortalMsg('');
    setPortalError('');
    try {
      const updated = await updateDeveloperPortalSettings(null);
      setPortalSettings(updated);
      setPortalUrlInput(updated.resolvedPublicApiUrl);
      setPortalMsg('Using environment fallback URL.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPortalError(msg ?? 'Failed to clear gateway URL.');
    } finally {
      setPortalSaving(false);
    }
  }

  function portalSourceLabel(source: DeveloperPortalSettings['source']) {
    switch (source) {
      case 'database':
        return 'Super Admin setting';
      case 'environment':
        return 'PUBLIC_API_URL in .env';
      case 'frontend':
        return 'FRONTEND_URL in .env';
      default:
        return 'Localhost default';
    }
  }

  const stats = useMemo(
    () => ({
      partners: partners.length,
      developers: developers.length,
      activeDevelopers: developers.filter((d) => d.status === 'ACTIVE').length,
      pendingProduction: productionRequests.length,
    }),
    [partners.length, developers, productionRequests.length]
  );

  function statusBadge(status: string) {
    if (status === 'ACTIVE') {
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    }
    if (status === 'SUSPENDED') {
      return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    }
    return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
  }

  function partnerInitials(name: string) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#1a2a6c] to-[#0f1a45] p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Shield className="h-3.5 w-3.5" />
              Super Admin
            </div>
            <h1 className="mt-3 font-montserrat text-2xl font-bold sm:text-3xl">Developer Access</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Manage partner organizations, API permissions, sandbox schools, and production access for
              third-party integrators.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPartner(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <Building2 className="h-4 w-4" />
              New partner
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-navy shadow-lg shadow-primary/25 transition hover:brightness-105"
            >
              <UserPlus className="h-4 w-4" />
              Create access
            </button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Partners', value: stats.partners, icon: Building2 },
            { label: 'Developers', value: stats.developers, icon: Users },
            { label: 'Active', value: stats.activeDevelopers, icon: CheckCircle2 },
            { label: 'Prod requests', value: stats.pendingProduction, icon: KeyRound },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
            >
              <div className="flex items-center gap-2 text-white/50">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
              </div>
              <p className="mt-1 font-montserrat text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gateway URL */}
      <form
        onSubmit={handleSavePortalSettings}
        className="overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/8 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-navy">Developer Gateway URL</h2>
              <p className="text-xs text-muted">Used in Test Lab, Postman, OpenAPI &amp; cURL</p>
            </div>
          </div>
          {portalSettings && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
              {portalSourceLabel(portalSettings.source)}
            </span>
          )}
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-sm text-muted">
            Enter your production domain — <code className="rounded bg-navy/5 px-1.5 py-0.5 text-xs">/api/v1</code>{' '}
            is appended automatically if omitted.
          </p>
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              id="portal-public-api-url"
              type="url"
              value={portalUrlInput}
              onChange={(e) => setPortalUrlInput(e.target.value)}
              placeholder="https://shuleplus.rw"
              className="min-w-0 flex-1 rounded-xl border border-navy/12 bg-slate-50/50 px-4 py-3 font-mono text-sm text-navy outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="submit"
                disabled={portalSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-primary transition hover:brightness-110 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {portalSaving ? 'Saving…' : 'Save URL'}
              </button>
              <button
                type="button"
                disabled={portalSaving}
                onClick={() => void handleClearPortalSettings()}
                className="rounded-xl border border-navy/15 bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5 disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
          {portalSettings && (
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Live gateway preview</p>
              <p className="mt-1 break-all font-mono text-xs text-navy">
                {portalSettings.gatewayBaseUrl}/{'{module}'}/{'{path}'}
              </p>
            </div>
          )}
          {portalMsg && (
            <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-100">
              {portalMsg}
            </p>
          )}
          {portalError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-100">
              {portalError}
            </p>
          )}
        </div>
      </form>

      {/* Tabs */}
      <div className="inline-flex rounded-2xl border border-navy/10 bg-slate-100/80 p-1">
        <button
          type="button"
          onClick={() => setTab('developers')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === 'developers'
              ? 'bg-white text-navy shadow-sm'
              : 'text-muted hover:text-navy'
          }`}
        >
          <Users className="h-4 w-4" />
          Developers
        </button>
        <button
          type="button"
          onClick={() => setTab('production')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            tab === 'production'
              ? 'bg-white text-navy shadow-sm'
              : 'text-muted hover:text-navy'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          Production
          {productionRequests.length > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {productionRequests.length}
            </span>
          )}
        </button>
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="mt-0.5 font-bold">!</span>
          {loadError}
        </div>
      )}

      {editSuccessMsg && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {editSuccessMsg}
          </span>
          <button
            type="button"
            onClick={() => setEditSuccessMsg('')}
            className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {activationResult && (
        <div
          className={`overflow-hidden rounded-2xl border shadow-sm ${
            activationResult.emailSent
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="p-5">
            <p
              className={`flex items-center gap-2 font-semibold ${
                activationResult.emailSent ? 'text-emerald-900' : 'text-amber-900'
              }`}
            >
              <Mail className="h-4 w-4" />
              Developer access created — activation link ready
            </p>
            <p
              className={`mt-2 text-sm ${
                activationResult.emailSent ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {activationResult.emailSent ? (
                <>
                  Activation email sent to <strong>{activationResult.email}</strong>. If it does not arrive
                  within a few minutes, check spam or use the link below.
                </>
              ) : (
                <>
                  Could not deliver email to <strong>{activationResult.email}</strong>. Copy the link below
                  and share it with the developer.
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-muted">{activationDeliveryHint(activationResult.emailDelivery)}</p>
            <div className="mt-4 flex flex-wrap items-start gap-2">
              <code className="block min-w-0 flex-1 break-all rounded-xl bg-white p-3 text-xs ring-1 ring-black/5">
                {activationResult.url}
              </code>
              <button
                type="button"
                onClick={() => copyActivationLink(activationResult.url)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-primary"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
              </button>
            </div>
          </div>
          <div className="border-t border-black/5 px-5 py-3">
            <button
              type="button"
              onClick={() => setActivationResult(null)}
              className="text-sm font-semibold text-navy hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {tab === 'developers' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-navy/10 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-primary transition hover:brightness-110"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      )}

      {partners.length > 0 && tab === 'developers' && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <Building2 className="h-4 w-4" />
            Partner organizations
          </h2>
          <div className="space-y-3">
            {partners.map((p) => {
              const partnerDevs = developers.filter((d) => d.partner.id === p.id);
              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-[#2a3f8f] font-montserrat text-sm font-bold text-primary">
                        {partnerInitials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-montserrat text-lg font-bold text-navy">{p.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-100">
                            <span className="font-semibold">Sandbox</span>
                            {p.sandboxOrganization?.name ?? 'Not linked'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 ring-1 ring-violet-100">
                            <span className="font-semibold">Production</span>
                            {p.productionOrganization?.name ?? p.productionAccessStatus ?? 'None'}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          {p._count?.users ?? 0} developer{p._count?.users === 1 ? '' : 's'} ·{' '}
                          {p._count?.applications ?? 0} OAuth app{p._count?.applications === 1 ? '' : 's'}
                        </p>
                        {p.sandboxOrganization?.id && (
                          <p className="mt-1 font-mono text-[10px] text-muted break-all">
                            Sandbox org: {p.sandboxOrganization.id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyBankOnboardingEmail(p)}
                        disabled={copyingPartnerId === p.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 disabled:opacity-50"
                      >
                        <Mail className="h-4 w-4" />
                        {copyingPartnerId === p.id ? 'Copying…' : 'Copy bank guide'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkPartnerId(p.id);
                          setLinkOrganizationId('');
                          setLinkMsg('');
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-navy/12 bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:border-navy/25 hover:bg-slate-50"
                      >
                        <Link2 className="h-4 w-4 text-primary" />
                        Link school
                      </button>
                      {partnerDevs.length === 1 && (
                        <button
                          type="button"
                          onClick={() => openEditDeveloper(partnerDevs[0]!)}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-navy shadow-sm transition hover:brightness-105"
                        >
                          <Shield className="h-4 w-4" />
                          Permissions
                        </button>
                      )}
                      {partnerDevs.length > 1 && (
                        <span className="inline-flex items-center rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-medium text-muted">
                          Edit permissions per developer below
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'production' ? (
        <div className="space-y-3">
          {productionRequests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-navy/15 bg-slate-50/50 py-16 text-center">
              <KeyRound className="mx-auto h-10 w-10 text-navy/20" />
              <p className="mt-3 font-medium text-navy">No pending production requests</p>
              <p className="mt-1 text-sm text-muted">Partners request production access from their developer portal.</p>
            </div>
          ) : (
            productionRequests.map((req) => (
              <article
                key={req.id}
                className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                        Pending
                      </span>
                      <p className="font-montserrat font-bold text-navy">{req.partner.name}</p>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {req.businessJustification ?? 'No justification provided'}
                    </p>
                    <p className="mt-2 text-xs text-muted">{new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await approveProductionRequest(req.id);
                        load();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await rejectProductionRequest(req.id);
                        load();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      <Ban className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
            <Users className="h-4 w-4" />
            Developer accounts
          </h2>
          <div className="overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-sm">
            {developers.length === 0 ? (
              <div className="py-16 text-center">
                <UserPlus className="mx-auto h-10 w-10 text-navy/20" />
                <p className="mt-3 font-medium text-navy">No developer accounts yet</p>
                <p className="mt-1 text-sm text-muted">Create a partner, then grant developer access.</p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Create access
                </button>
              </div>
            ) : (
              <div className="divide-y divide-navy/8">
                {developers.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50/80 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy/8 font-semibold text-navy">
                        {d.firstName[0]}
                        {d.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-navy">
                          {d.firstName} {d.lastName}
                        </p>
                        <p className="truncate text-sm text-muted">{d.email}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 lg:hidden">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(d.status)}`}>
                            {d.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted">{d.partner.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden flex-wrap items-center gap-6 lg:flex">
                      <div className="w-28 text-sm font-medium text-navy">{d.partner.name}</div>
                      <div className="w-16 text-center text-sm text-muted">
                        {d.mfaEnabled ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> On
                          </span>
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="w-28">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(d.status)}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="w-24 text-xs font-semibold uppercase tracking-wide text-muted">
                        {d.accessType.replace('_', ' ')}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditDeveloper(d)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-navy/12 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition hover:bg-navy/5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      {d.status === 'PENDING_ACTIVATION' && (
                        <button
                          type="button"
                          disabled={resendingId === d.id}
                          onClick={() => handleResendActivation(d)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 disabled:opacity-50"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {resendingId === d.id ? 'Sending…' : 'Resend link'}
                        </button>
                      )}
                      {d.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => handleSuspend(d.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Suspend
                        </button>
                      ) : d.status === 'SUSPENDED' ? (
                        <button
                          type="button"
                          onClick={() => handleActivate(d.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Activate
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={deletingId === d.id}
                        onClick={() => handleDelete(d)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === d.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Create Partner Modal */}
      {showPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreatePartner}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="border-b border-navy/8 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-montserrat text-lg font-bold text-navy">New partner organization</h2>
                    <p className="text-sm text-muted">For banks, fintechs, or integration partners</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPartner(false)}
                  className="rounded-lg p-1.5 text-muted hover:bg-navy/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted">Partner name</label>
                <input
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g. Equity Bank Integration"
                  required
                  className="mt-1.5 w-full rounded-xl border border-navy/12 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted">
                  Sandbox school (required)
                </label>
                <select
                  value={partnerOrganizationId}
                  onChange={(e) => setPartnerOrganizationId(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-navy/12 px-4 py-3 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select a school on this server…</option>
                  {[...schoolOrganizations]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                      {org.organizationCode ? ` (${org.organizationCode})` : ''}
                    </option>
                  ))}
                </select>
                {partnerOrganizationId ? (
                  <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                      Organization ID (for Postman)
                    </p>
                    <p className="mt-0.5 break-all font-mono text-xs text-emerald-900">{partnerOrganizationId}</p>
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-muted">
                    Choose the school whose students and fees the bank will test against. Multiple partners can share the same school.
                  </p>
                )}
              </div>
              {partnerError && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{partnerError}</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-navy/8 bg-slate-50/80 px-6 py-4">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-primary"
              >
                <Plus className="h-4 w-4" />
                Create partner
              </button>
              <button
                type="button"
                onClick={() => setShowPartner(false)}
                className="rounded-xl border border-navy/15 px-5 py-3 text-sm font-semibold text-navy"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Link sandbox to real school */}
      {linkPartnerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleLinkSandbox}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="border-b border-navy/8 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-montserrat text-lg font-bold text-navy">Link sandbox school</h2>
                    <p className="text-sm text-muted">Live Student Management data for API testing</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkPartnerId(null)}
                  className="rounded-lg p-1.5 text-muted hover:bg-navy/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <label className="text-xs font-bold uppercase tracking-wide text-muted">School organization</label>
              <select
                value={linkOrganizationId}
                onChange={(e) => setLinkOrganizationId(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-navy/12 px-4 py-3 text-sm outline-none focus:border-primary"
              >
                <option value="">Select school organization…</option>
                {[...schoolOrganizations]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                    {org.organizationCode ? ` (${org.organizationCode})` : ''}
                  </option>
                ))}
              </select>
              {linkOrganizationId && (
                <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">Organization ID</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-sky-900">{linkOrganizationId}</p>
                </div>
              )}
              {linkMsg && (
                <p className="mt-3 rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-sky-900">{linkMsg}</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-navy/8 bg-slate-50/80 px-6 py-4">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-primary"
              >
                <Link2 className="h-4 w-4" />
                Link organization
              </button>
              <button
                type="button"
                onClick={() => setLinkPartnerId(null)}
                className="rounded-xl border border-navy/15 px-5 py-3 text-sm font-semibold text-navy"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit Access Modal */}
      <CreateDeveloperAccessModal
        open={showCreate || Boolean(editingDeveloper)}
        loading={loading}
        partners={partners}
        permissionConfig={permissionConfig}
        form={form}
        error={editingDeveloper ? editAccessError : createAccessError}
        editingDeveloper={editingDeveloper}
        onClose={() => {
          if (editingDeveloper) closeEditModal();
          else {
            setShowCreate(false);
            setCreateAccessError('');
          }
        }}
        onSubmit={editingDeveloper ? handleUpdateAccess : handleCreateAccess}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onToggleModule={toggleModule}
        onTogglePermission={togglePermission}
        onSelectAllModuleScopes={selectAllModuleScopes}
        onDeselectAllModuleScopes={deselectAllModuleScopes}
        onSelectAllModules={selectAllModules}
        onDeselectAllModules={deselectAllModules}
      />
    </div>
  );
}
