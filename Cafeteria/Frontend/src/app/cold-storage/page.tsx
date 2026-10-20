'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, X, Thermometer, AlertTriangle } from 'lucide-react';
import type { ColdStorageLog } from '@/types';

const initialForm = {
  logDate: new Date().toISOString().split('T')[0],
  freezerTemperature: 0,
  refrigeratorTemperature: 0,
  storageConditions: '',
  loggedBy: '',
  notes: '',
};

export default function ColdStoragePage() {
  const [logs, setLogs] = useState<ColdStorageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const load = useCallback(async () => {
    try {
      const data = await cafeteriaApi.coldStorage.list();
      setLogs(data);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const alertsTriggered = form.freezerTemperature > -15 || form.refrigeratorTemperature > 5;
    try {
      await cafeteriaApi.coldStorage.create({ ...form, alertsTriggered });
      toast.success('Temperature log recorded');
      if (alertsTriggered) toast.warning('Temperature alerts triggered!');
      setDialogOpen(false);
      setForm(initialForm);
      load();
    } catch {
      toast.error('Failed to record log');
    }
  };

  const tempStatus = (temp: number, type: 'freezer' | 'fridge') => {
    if (type === 'freezer') {
      if (temp > -15) return 'text-red-600';
      if (temp > -18) return 'text-yellow-600';
      return 'text-green-600';
    }
    if (temp > 5) return 'text-red-600';
    if (temp > 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cold Storage Monitoring</h1>
            <p className="text-sm text-muted-foreground">Track freezer and refrigerator temperatures</p>
          </div>
          <button onClick={() => { setForm(initialForm); setDialogOpen(true); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Record Temperature
          </button>
        </div>

        {logs.length > 0 && (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
              <Thermometer className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{logs[0].freezerTemperature}°C</p>
              <p className="text-xs text-muted-foreground">Latest Freezer Temp</p>
              <p className={`text-xs font-medium ${tempStatus(logs[0].freezerTemperature, 'freezer')}`}>
                {logs[0].freezerTemperature > -15 ? 'CRITICAL' : logs[0].freezerTemperature > -18 ? 'WARNING' : 'OPTIMAL'}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
              <Thermometer className="h-8 w-8 mx-auto text-cyan-500 mb-2" />
              <p className="text-2xl font-bold">{logs[0].refrigeratorTemperature}°C</p>
              <p className="text-xs text-muted-foreground">Latest Fridge Temp</p>
              <p className={`text-xs font-medium ${tempStatus(logs[0].refrigeratorTemperature, 'fridge')}`}>
                {logs[0].refrigeratorTemperature > 5 ? 'CRITICAL' : logs[0].refrigeratorTemperature > 2 ? 'WARNING' : 'OPTIMAL'}
              </p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold">{logs.filter(l => l.alertsTriggered).length}</p>
              <p className="text-xs text-muted-foreground">Alerts Triggered</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm text-center">
              <Thermometer className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total Logs</p>
            </div>
          </div>
        )}

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Record Temperature</h2>
                <button onClick={() => setDialogOpen(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" value={form.logDate} onChange={(e) => setForm({ ...form, logDate: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logged By</label>
                  <input value={form.loggedBy} onChange={(e) => setForm({ ...form, loggedBy: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Staff name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Freezer Temperature (°C)</label>
                  <input type="number" step="0.1" value={form.freezerTemperature || ''} onChange={(e) => setForm({ ...form, freezerTemperature: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="-18" />
                  <p className="text-xs text-muted-foreground mt-1">Optimal: -18°C or below</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Refrigerator Temperature (°C)</label>
                  <input type="number" step="0.1" value={form.refrigeratorTemperature || ''} onChange={(e) => setForm({ ...form, refrigeratorTemperature: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="2" />
                  <p className="text-xs text-muted-foreground mt-1">Optimal: 0-5°C</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Storage Conditions</label>
                  <input value={form.storageConditions} onChange={(e) => setForm({ ...form, storageConditions: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., Good, door seal OK" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDialogOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">Record</button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Freezer (°C)</th>
                <th className="text-left px-4 py-3 font-medium">Fridge (°C)</th>
                <th className="text-left px-4 py-3 font-medium">Conditions</th>
                <th className="text-left px-4 py-3 font-medium">Alerts</th>
                <th className="text-left px-4 py-3 font-medium">Logged By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(log.logDate).toLocaleDateString()}</td>
                  <td className={`px-4 py-3 font-medium ${tempStatus(log.freezerTemperature, 'freezer')}`}>{log.freezerTemperature}°C</td>
                  <td className={`px-4 py-3 font-medium ${tempStatus(log.refrigeratorTemperature, 'fridge')}`}>{log.refrigeratorTemperature}°C</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.storageConditions || '-'}</td>
                  <td className="px-4 py-3">
                    {log.alertsTriggered ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Alert</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.loggedBy}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No temperature logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
