'use client';

import { useEffect, useRef, useState } from 'react';
import { Image, Stamp, PenLine, Palette, Upload, Download, Crop } from 'lucide-react';
import { useToast } from '@/shared/notifications';
import { fetchAssets, uploadAsset } from '@/services/babyeyi-api';

const ASSET_TYPES = [
  { key: 'logo', label: 'School Logo', icon: Image },
  { key: 'stamp', label: 'Stamp', icon: Stamp },
  { key: 'signature', label: 'Principal Signature', icon: PenLine },
  { key: 'other_logo', label: 'Other Logo', icon: Image },
  { key: 'letterhead', label: 'Letter Head', icon: Image },
  { key: 'footer', label: 'Footer', icon: Image },
];

export function AssetsView() {
  const toast = useToast();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState('logo');

  async function load() {
    try {
      const data = await fetchAssets();
      setProfile(data.profile);
    } catch {
      toast.error('Failed to load assets');
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAsset(file, uploadType);
      toast.success('Asset uploaded');
      void load();
    } catch {
      toast.error('Upload failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="hr-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h3 className="font-bold text-navy">Theme</h3>
          <div className="mt-2 flex items-center gap-3">
            <span className="h-8 w-8 rounded-full border" style={{ background: (profile?.themeColor as string) ?? '#FCB038' }} />
            <span className="text-sm text-muted">{(profile?.themeColor as string) ?? '#FCB038'} · {(profile?.fontFamily as string) ?? 'Montserrat'}</span>
            <Palette size={16} className="text-muted" />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleUpload(e)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ASSET_TYPES.map((asset) => (
          <div key={asset.key} className="hr-card hr-card-hover p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <asset.icon size={20} className="text-navy" />
              </span>
              <h4 className="font-semibold text-navy">{asset.label}</h4>
            </div>
            <div className="mt-4 flex h-24 items-center justify-center rounded-xl border border-dashed border-border bg-navy/[0.02]">
              <p className="text-xs text-muted">Preview</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setUploadType(asset.key); fileRef.current?.click(); }} className="btn-secondary text-xs"><Upload size={14} /> Replace</button>
              <button type="button" className="btn-secondary text-xs"><Crop size={14} /> Crop</button>
              <button type="button" className="btn-secondary text-xs"><Download size={14} /> Download</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
