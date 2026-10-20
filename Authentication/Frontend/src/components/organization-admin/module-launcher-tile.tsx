'use client';

import Image from 'next/image';
import type { LicensedModule } from '@/lib/modules';
import { resolveModuleIcon } from '@/lib/module-icons';
import {
  getModuleLifecycleStatus,
  isModuleLaunchable,
  MODULE_LIFECYCLE_META,
} from '@/lib/module-lifecycle';

interface ModuleLauncherTileProps {
  mod: LicensedModule;
  onOpen: (mod: LicensedModule) => void;
}

function ModuleSvgIcon({ mod }: { mod: LicensedModule }) {
  const src = resolveModuleIcon(mod);

  return (
    <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
      <span className="relative flex h-full w-full items-center justify-center rounded-xl border border-border/80 bg-white shadow-sm">
        <Image
          src={src}
          alt=""
          width={40}
          height={40}
          className="h-8 w-8 object-contain sm:h-9 sm:w-9"
          unoptimized
        />
      </span>
    </span>
  );
}

export function ModuleLauncherTile({ mod, onOpen }: ModuleLauncherTileProps) {
  const lifecycle = getModuleLifecycleStatus(mod);
  const meta = MODULE_LIFECYCLE_META[lifecycle];
  const launchable = isModuleLaunchable(mod);

  return (
    <button
      type="button"
      onClick={() => {
        if (!launchable) return;
        onOpen(mod);
      }}
      disabled={!launchable}
      className={`group flex w-full flex-col rounded-2xl border border-border p-3.5 text-left transition sm:p-4 ${
        launchable
          ? 'bg-white shadow-sm hover:border-primary/30 hover:shadow-md'
          : 'cursor-not-allowed bg-slate-50/80'
      }`}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <ModuleSvgIcon mod={mod} />
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${meta.pillClass}`}
        >
          {meta.shortLabel}
        </span>
      </div>

      <div className="mt-3 min-w-0 space-y-0.5">
        <h2
          className={`truncate text-sm font-semibold sm:text-[15px] ${
            launchable ? 'text-navy group-hover:text-primary' : 'text-navy/80'
          }`}
        >
          {mod.name}
        </h2>
        <p className="truncate text-[11px] text-muted sm:text-xs">{mod.category ?? mod.slug}</p>
        {!launchable && (
          <p className="pt-0.5 text-[11px] leading-snug text-muted">{meta.description}</p>
        )}
      </div>

      {launchable && (
        <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition group-hover:opacity-100">
          Open
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </button>
  );
}
