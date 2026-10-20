'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Settings, Save } from 'lucide-react';
import type { Setting } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await cafeteriaApi.settings.list();
      setSettings(data);
      const formObj: Record<string, string> = {};
      data.forEach((s) => { formObj[s.key] = s.value; });
      setForm(formObj);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (key: string) => {
    try {
      await cafeteriaApi.settings.update(key, form[key]);
      toast.success('Setting updated');
    } catch {
      toast.error('Failed to update setting');
    }
  };

  const defaultSettings = [
    { key: 'meal_serving_start_breakfast', label: 'Breakfast Start Time', placeholder: '06:00', type: 'time' },
    { key: 'meal_serving_end_breakfast', label: 'Breakfast End Time', placeholder: '08:00', type: 'time' },
    { key: 'meal_serving_start_lunch', label: 'Lunch Start Time', placeholder: '11:30', type: 'time' },
    { key: 'meal_serving_end_lunch', label: 'Lunch End Time', placeholder: '13:30', type: 'time' },
    { key: 'meal_serving_start_dinner', label: 'Dinner Start Time', placeholder: '17:00', type: 'time' },
    { key: 'meal_serving_end_dinner', label: 'Dinner End Time', placeholder: '19:00', type: 'time' },
    { key: 'default_servings_per_student', label: 'Default Servings Per Student', placeholder: '1', type: 'number' },
    { key: 'waste_alert_threshold_kg', label: 'Waste Alert Threshold (kg)', placeholder: '10', type: 'number' },
    { key: 'budget_alert_percentage', label: 'Budget Alert (%)', placeholder: '80', type: 'number' },
    { key: 'temperature_alert_freezer', label: 'Freezer Temp Alert (°C)', placeholder: '-15', type: 'number' },
    { key: 'temperature_alert_fridge', label: 'Fridge Temp Alert (°C)', placeholder: '5', type: 'number' },
    { key: 'enable_auto_stock_deduction', label: 'Auto Stock Deduction', placeholder: 'true', type: 'toggle' },
  ];

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure cafeteria module settings</p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
          <h2 className="font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> Meal Serving Times</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {defaultSettings.filter(s => s.key.includes('meal_serving')).map((setting) => (
              <div key={setting.key}>
                <label className="block text-sm font-medium mb-1">{setting.label}</label>
                <div className="flex gap-2">
                  <input
                    type={setting.type === 'time' ? 'time' : 'text'}
                    value={form[setting.key] || setting.placeholder}
                    onChange={(e) => setForm({ ...form, [setting.key]: e.target.value })}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button onClick={() => handleSave(setting.key)} className="rounded-lg bg-primary px-3 py-2 text-white hover:bg-primary/90">
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
          <h2 className="font-semibold">Operational Settings</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {defaultSettings.filter(s => !s.key.includes('meal_serving')).map((setting) => (
              <div key={setting.key}>
                <label className="block text-sm font-medium mb-1">{setting.label}</label>
                <div className="flex gap-2">
                  {setting.type === 'toggle' ? (
                    <select
                      value={form[setting.key] || setting.placeholder}
                      onChange={(e) => setForm({ ...form, [setting.key]: e.target.value })}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <input
                      type={setting.type}
                      value={form[setting.key] || setting.placeholder}
                      onChange={(e) => setForm({ ...form, [setting.key]: e.target.value })}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  )}
                  <button onClick={() => handleSave(setting.key)} className="rounded-lg bg-primary px-3 py-2 text-white hover:bg-primary/90">
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
          <h2 className="font-semibold">Custom Settings</h2>
          {settings.filter(s => !defaultSettings.some(ds => ds.key === s.key)).length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {settings.filter(s => !defaultSettings.some(ds => ds.key === s.key)).map((setting) => (
                <div key={setting.key}>
                  <label className="block text-sm font-medium mb-1">{setting.key.replace(/_/g, ' ')}</label>
                  <div className="flex gap-2">
                    <input
                      value={form[setting.key] || ''}
                      onChange={(e) => setForm({ ...form, [setting.key]: e.target.value })}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm"
                    />
                    <button onClick={() => handleSave(setting.key)} className="rounded-lg bg-primary px-3 py-2 text-white hover:bg-primary/90">
                      <Save className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No custom settings configured</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
