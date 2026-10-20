export function SettingsView() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Settings</h1>
      <p className="text-sm text-muted">Tenant settings for this organization workspace.</p>
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="text-sm text-muted">General, permissions, subscription, and API keys can be configured here.</p>
      </div>
    </div>
  );
}
