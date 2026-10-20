'use client';

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function PayrollTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            active === tab.id
              ? 'bg-white text-navy shadow-sm ring-1 ring-slate-200/80'
              : 'text-muted hover:text-navy'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
