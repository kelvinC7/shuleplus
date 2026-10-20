"use client";

import type { ReactNode } from "react";
import { OrgAdminAppShell } from "@/layouts/org-admin-app-shell";

export default function OrgAdminLayout({ children }: { children: ReactNode }) {
  return <OrgAdminAppShell>{children}</OrgAdminAppShell>;
}
