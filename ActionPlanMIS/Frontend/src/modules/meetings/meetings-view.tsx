'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, Calendar, Clock, MapPin } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { ApModal } from '@/components/ap-modal';
import { StatusBadge } from '@/components/status-badge';
import type { Meeting } from '@/types';

export function MeetingsView() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    meetingDate: '',
    startTime: '',
    endTime: '',
    participants: '',
  });

  useEffect(() => { loadMeetings(); }, []);

  async function loadMeetings() {
    setLoading(true);
    try {
      const { data } = await apApi.listMeetings();
      setMeetings(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function createMeeting() {
    if (!form.title.trim() || !form.meetingDate) return;
    try {
      await apApi.createMeeting({
        ...form,
        participants: form.participants.split(',').map((s: string) => s.trim()).filter(Boolean),
      });
      setForm({ title: '', description: '', location: '', meetingDate: '', startTime: '', endTime: '', participants: '' });
      setShowForm(false);
      loadMeetings();
    } catch (err) { console.error(err); }
  }

  return (
    <>
      <ApPageLayout
        actions={
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={14} />
            Schedule Meeting
          </button>
        }
      >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : meetings.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted">No meetings scheduled</div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <div key={m.id} className="card flex flex-wrap items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy/[0.04]">
                <Calendar size={20} className="text-navy" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-navy">{m.title}</h3>
                  <StatusBadge status={m.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(m.meetingDate).toLocaleDateString()}
                  </span>
                  {m.startTime && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {m.startTime}{m.endTime ? ` - ${m.endTime}` : ''}
                    </span>
                  )}
                  {m.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {m.location}
                    </span>
                  )}
                  <span>{m.participants?.length ?? 0} participant(s)</span>
                </div>
                {m.description && <p className="mt-1 text-xs text-muted">{m.description}</p>}
                {m.minutes?.length > 0 && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] font-medium text-muted uppercase">Minutes ({m.minutes.length})</p>
                    {m.minutes.map((min) => (
                      <p key={min.id} className="text-xs text-muted">
                        {min.decision && <span className="font-medium text-navy">Decision: </span>}
                        {min.content}
                        {min.actionItem && <span className="italic"> → Action: {min.actionItem}</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </ApPageLayout>

      <ApModal
        open={showForm}
        eyebrow="Meetings"
        title="Schedule Meeting"
        onClose={() => setShowForm(false)}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-navy">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-navy">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[60px] resize-y" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Date *</label>
              <input type="date" value={form.meetingDate} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">Start Time</label>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-navy">End Time</label>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-navy">Participants (comma separated)</label>
              <input value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} className="input" placeholder="user1@email.com, user2@email.com" />
            </div>
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <button onClick={createMeeting} disabled={!form.title || !form.meetingDate} className="btn-primary">
              <Plus size={14} />
              Schedule
            </button>
          </div>
        </div>
      </ApModal>
    </>
  );
}
