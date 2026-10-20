"use client";

import { ReactNode } from "react";
import { PlatformAppShell } from "@/layouts/platform-app-shell";
import { filterNavBySettings } from "@/lib/nav-config";
import { useSettings } from "@/contexts/settings-context";

export function MainLayout({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const sections = filterNavBySettings(settings);

  return (
    <PlatformAppShell
      moduleLabel="Uniforms"
      searchPlaceholder="Search uniforms, students, sales…"
      sections={sections}
    >
      {children}
    </PlatformAppShell>
  );
}
