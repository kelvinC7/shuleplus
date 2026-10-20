import { DesignNav } from "@/components/layout/design-nav";

export const metadata = {
  title: "Design System - ShulePlus",
};

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen surface-mesh">
      <DesignNav />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
