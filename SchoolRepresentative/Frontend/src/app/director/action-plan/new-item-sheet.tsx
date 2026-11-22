'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { toast } from 'sonner';
import { FormSheet } from '@/components/form-sheet';
import { ChipSelect, FormField, FormRow, SegmentedTabs, TagInput } from '@/components/form-kit';
import { consoleApi } from '@/services/console-api';
import { apiErrorMessage } from '@/services/api';
import { addDays, endOfMonth, hhmm, nextWeekday, splitList, toDayKey, todayKey } from '@/lib/action-plan';

export type CreateMode = 'task' | 'meeting';

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const ROLE_SUGGESTIONS = ['Director', 'Head Teacher', 'Deputy Head', 'Chief Accountant', 'HR Manager', 'Dean of Studies'];

function quickDates(): Array<{ value: string; label: string }> {
  const now = new Date();
  const picks = [
    { value: toDayKey(now), label: 'Today' },
    { value: toDayKey(addDays(now, 1)), label: 'Tomorrow' },
    { value: toDayKey(nextWeekday(1)), label: 'Next Monday' },
    { value: toDayKey(endOfMonth(now)), label: 'End of month' },
  ];
  // drop duplicates (e.g. end of month === tomorrow)
  return picks.filter((p, i) => picks.findIndex((q) => q.value === p.value) === i);
}

export function NewItemSheet({
  open,
  mode,
  onMode,
  onClose,
  organizationId,
  onCreated,
}: {
  open: boolean;
  mode: CreateMode;
  onMode: (mode: CreateMode) => void;
  onClose: () => void;
  organizationId: string;
  onCreated: (mode: CreateMode) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  // meeting
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [venue, setVenue] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [agenda, setAgenda] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) setError(null);
  }, [open, mode]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setOwner('');
    setPriority('MEDIUM');
    setDueDate('');
    setMTitle('');
    setMDate('');
    setStart('');
    setEnd('');
    setVenue('');
    setPeople([]);
    setAgenda('');
    setNotes('');
    setError(null);
  };

  const submitTask = async () => {
    if (!title.trim()) return setError('Give the task a title.');
    if (!owner.trim()) return setError('Say who is responsible.');
    if (dueDate && dueDate < todayKey()) return setError('The due date is in the past.');
    setBusy(true);
    setError(null);
    try {
      await consoleApi.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        owner: owner.trim(),
        priority,
        dueDate: dueDate || undefined,
        organizationId,
      });
      toast.success('Task created');
      reset();
      onCreated('task');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create task'));
    } finally {
      setBusy(false);
    }
  };

  const submitMeeting = async () => {
    if (!mTitle.trim()) return setError('Give the meeting a title.');
    if (!mDate) return setError('Pick a date.');
    if (mDate < todayKey()) return setError('Pick today or a later date.');
    if (start && end && hhmm(end) <= hhmm(start)) return setError('The end time must be after the start time.');
    setBusy(true);
    setError(null);
    try {
      await consoleApi.createMeeting({
        title: mTitle.trim(),
        description: notes.trim() || undefined,
        meetingDate: mDate,
        startTime: start || undefined,
        endTime: end || undefined,
        location: venue.trim() || undefined,
        participants: people,
        agenda: splitList(agenda, /\n/),
        organizationId,
      });
      toast.success('Meeting scheduled');
      reset();
      onCreated('meeting');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not schedule meeting'));
    } finally {
      setBusy(false);
    }
  };

  const isTask = mode === 'task';

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title="Create"
      busy={busy}
      error={error}
      submitLabel={isTask ? 'Create task' : 'Schedule meeting'}
      submitDisabled={isTask ? !title.trim() || !owner.trim() : !mTitle.trim() || !mDate}
      onSubmit={() => void (isTask ? submitTask() : submitMeeting())}
      header={
        <SegmentedTabs
          value={mode}
          onChange={(m) => {
            setError(null);
            onMode(m);
          }}
          options={[
            { value: 'task', label: 'Task' },
            { value: 'meeting', label: 'Meeting' },
          ]}
        />
      }
    >
      {isTask ? (
        <Box>
          <FormField label="Title" value={title} onChange={setTitle} placeholder="What needs to be done?" maxLength={120} autoFocus />
          <FormField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Context, expected outcome or next steps…"
            multiline
            minRows={3}
            maxLength={600}
          />
          <FormRow>
            <FormField label="Owner" value={owner} onChange={setOwner} placeholder="Who is responsible?" maxLength={80} />
            <FormField label="Due date" value={dueDate} onChange={setDueDate} type="date" />
          </FormRow>
          <ChipSelect label="Due" value={dueDate} options={quickDates()} onChange={(v) => setDueDate(dueDate === v ? '' : v)} />
          <ChipSelect label="Priority" value={priority} options={PRIORITIES} onChange={setPriority} />
        </Box>
      ) : (
        <Box>
          <FormField label="Title" value={mTitle} onChange={setMTitle} placeholder="e.g. Term 3 leadership review" maxLength={120} autoFocus />
          <FormRow>
            <FormField label="Date" value={mDate} onChange={setMDate} type="date" />
            <FormField label="Venue" value={venue} onChange={setVenue} placeholder="Boardroom" maxLength={80} />
          </FormRow>
          <FormRow>
            <FormField label="Starts" value={start} onChange={setStart} type="time" />
            <FormField label="Ends" value={end} onChange={setEnd} type="time" />
          </FormRow>
          <TagInput
            label="Participants"
            values={people}
            onChange={setPeople}
            placeholder="Type a name, press Enter"
            suggestions={ROLE_SUGGESTIONS}
          />
          <FormField
            label="Agenda"
            value={agenda}
            onChange={setAgenda}
            placeholder={'Results and pass rate\nFee collection plan\nStaffing gaps'}
            multiline
            minRows={3}
            helper="One item per line."
          />
          <FormField
            label="Notes"
            value={notes}
            onChange={setNotes}
            placeholder="Purpose, documents to prepare, decisions expected…"
            multiline
            minRows={2}
            maxLength={600}
          />
        </Box>
      )}
    </FormSheet>
  );
}
