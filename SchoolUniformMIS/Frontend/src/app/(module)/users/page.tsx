"use client";

import { UsersView } from "@/modules/users/users-view";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

export default function UsersPage() {
  const { isOrgAdmin } = useAuth();

  if (!isOrgAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-navy">Organization Admin Only</h1>
        <p className="mt-2 text-sm text-muted">
          Only organization administrators can add users and assign module
          access.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <UsersView />;
}
