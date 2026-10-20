'use client';

import { useState } from 'react';
import { Monitor, Tablet, Smartphone, FileText, Share2, Printer, Download, QrCode, Link2 } from 'lucide-react';

const DEVICE_TABS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'pdf', label: 'PDF', icon: FileText },
];

export function ParentPreviewView() {
  const [device, setDevice] = useState('desktop');

  const widthClass = { desktop: 'max-w-4xl', tablet: 'max-w-xl', mobile: 'max-w-sm', pdf: 'max-w-3xl' }[device];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-white p-1">
          {DEVICE_TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setDevice(tab.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${device === tab.id ? 'bg-primary text-navy' : 'text-muted'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {[Share2, Printer, Download, QrCode, Link2].map((Icon, i) => (
            <button key={i} type="button" className="btn-secondary p-2"><Icon size={16} /></button>
          ))}
        </div>
      </div>

      <div className="flex justify-center rounded-2xl border border-border bg-slate-100 p-6">
        <div className={`w-full ${widthClass} hr-card overflow-hidden`}>
          <div className="bg-navy px-6 py-4 text-white">
            <p className="text-xs opacity-70">Official School Circular</p>
            <h2 className="text-xl font-bold">P4 — Term 1 2025-2026</h2>
          </div>
          <div className="space-y-4 p-6 text-sm">
            <section>
              <h3 className="font-bold text-navy">Payments</h3>
              <p className="text-muted">Tuition: 8,500 RWF · Development: 2,000 RWF</p>
            </section>
            <section>
              <h3 className="font-bold text-navy">Requirements</h3>
              <ul className="list-disc pl-5 text-muted"><li>Exercise books (12)</li><li>School uniform (2)</li></ul>
            </section>
            <section>
              <h3 className="font-bold text-navy">Bank Details</h3>
              <p className="text-muted">Bank of Kigali — 1234567890</p>
            </section>
            <div className="flex justify-center pt-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-border bg-navy/5">
                <QrCode size={32} className="text-navy/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
