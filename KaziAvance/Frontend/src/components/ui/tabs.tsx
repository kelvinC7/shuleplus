"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type TabsContextValue = {
  active: string;
  setActive: (id: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  children,
  className = "",
}: {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}) {
  const [active, setActive] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-1 border-b border-border pb-1 ${className}`} role="tablist">
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const isActive = ctx.active === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.setActive(value)}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        isActive ? "bg-navy text-white shadow-sm" : "text-muted hover:bg-slate-100 hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = "",
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx || ctx.active !== value) return null;
  return (
    <div role="tabpanel" className={`animate-fade-in-up pt-5 ${className}`}>
      {children}
    </div>
  );
}
