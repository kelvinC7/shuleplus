import { useState } from 'react';
import { BarChart3, ClipboardList, List, Plus } from 'lucide-react';
import RecordMarksWizard from '../components/RecordMarksWizard.jsx';
import RecordMarksAllRecords from '../components/RecordMarksAllRecords.jsx';
import RecordMarksPerformance from '../components/RecordMarksPerformance.jsx';

export default function RecordMarks() {
  const [tab, setTab] = useState('new');
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="inline-flex w-full max-w-2xl flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 sm:w-auto">
        <button
          type="button"
          onClick={() => setTab('new')}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold sm:flex-none sm:text-sm ${
            tab === 'new' ? 'bg-[#000435] text-white shadow-md' : 'text-slate-600 hover:text-[#000435]'
          }`}
        >
          <Plus className="h-4 w-4 shrink-0" />
          New entry
        </button>
        <button
          type="button"
          onClick={() => setTab('records')}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold sm:flex-none sm:text-sm ${
            tab === 'records' ? 'bg-[#000435] text-white shadow-md' : 'text-slate-600 hover:text-[#000435]'
          }`}
        >
          <List className="h-4 w-4 shrink-0" />
          All records
        </button>
        <button
          type="button"
          onClick={() => setTab('performance')}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold sm:flex-none sm:text-sm ${
            tab === 'performance' ? 'bg-[#000435] text-white shadow-md' : 'text-slate-600 hover:text-[#000435]'
          }`}
        >
          <BarChart3 className="h-4 w-4 shrink-0" />
          Performance
        </button>
      </div>

      {tab === 'new' ? (
        <div className="tp-card p-6 sm:p-8">
          <div className="max-w-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FCB038]/15">
              <ClipboardList className="h-6 w-6 text-[#c87800]" />
            </div>
            <h3 className="text-lg font-semibold text-[#000435]">Guided mark entry</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Pick your class, create or choose an assessment, enter scores, then publish when ready.
            </p>
            <button type="button" onClick={() => setWizardOpen(true)} className="tp-btn-primary mt-6 inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Start wizard
            </button>
          </div>
        </div>
      ) : tab === 'performance' ? (
        <RecordMarksPerformance />
      ) : (
        <RecordMarksAllRecords />
      )}

      <RecordMarksWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onPublished={() => setTab('records')}
      />
    </div>
  );
}
