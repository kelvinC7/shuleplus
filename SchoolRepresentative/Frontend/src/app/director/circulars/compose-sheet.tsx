'use client';

import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import SendIcon from '@mui/icons-material/Send';
import { toast } from 'sonner';
import { FormSheet } from '@/components/form-sheet';
import { ChipSelect, FormField, FormRow, SegmentedTabs } from '@/components/form-kit';
import { consoleApi } from '@/services/console-api';
import { apiErrorMessage } from '@/services/api';
import { todayKey } from '@/lib/action-plan';
import { formatNumber } from '@/lib/format';
import type { BroadcastsData } from '@/types';

export type ComposeMode = 'broadcast' | 'circular';

const CHANNELS = [
  { value: 'app', label: 'App' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

const DEFAULT_AUDIENCES = [
  { id: 'all', label: 'Everyone', recipients: 0, channels: ['app', 'sms', 'email'] },
  { id: 'parents', label: 'Parents', recipients: 0, channels: ['app', 'sms', 'email'] },
  { id: 'staff', label: 'Staff', recipients: 0, channels: ['app', 'sms', 'email'] },
];

type Audience = BroadcastsData['audiences'][number];

export function ComposeSheet({
  open,
  mode,
  onMode,
  onClose,
  organizationId,
  audiences,
  templates,
  onSent,
}: {
  open: boolean;
  mode: ComposeMode;
  onMode: (mode: ComposeMode) => void;
  onClose: () => void;
  organizationId: string;
  audiences: Audience[];
  templates: BroadcastsData['templates'];
  onSent: (mode: ComposeMode) => void;
}) {
  const audienceList = useMemo<Audience[]>(() => (audiences.length ? audiences : DEFAULT_AUDIENCES), [audiences]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // broadcast
  const [audienceId, setAudienceId] = useState('');
  const [channels, setChannels] = useState<string[]>(['app']);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('08:00');

  // circular
  const [cTitle, setCTitle] = useState('');
  const [cAudience, setCAudience] = useState('');
  const [cBody, setCBody] = useState('');
  const [cAction, setCAction] = useState<'publish' | 'draft'>('publish');

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAudienceId((cur) => (audienceList.some((a) => a.id === cur) ? cur : audienceList[0].id));
    setCAudience((cur) => (audienceList.some((a) => a.id === cur) ? cur : audienceList[0].id));
  }, [open, audienceList]);

  const audience = audienceList.find((a) => a.id === audienceId) ?? audienceList[0];
  const availableChannels = CHANNELS.filter((c) => !audience.channels.length || audience.channels.includes(c.value));

  // keep chosen channels valid when the audience changes
  useEffect(() => {
    setChannels((cur) => {
      const valid = cur.filter((c) => availableChannels.some((a) => a.value === c));
      return valid.length ? valid : availableChannels.slice(0, 1).map((c) => c.value);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceId]);

  const reset = () => {
    setSubject('');
    setMessage('');
    setWhen('now');
    setDate('');
    setCTitle('');
    setCBody('');
    setCAction('publish');
    setError(null);
  };

  const smsParts = Math.max(1, Math.ceil(message.length / 160));
  const isBroadcast = mode === 'broadcast';
  const scheduledFor = when === 'later' && date ? `${date}T${time || '08:00'}` : undefined;

  const sendBroadcast = async () => {
    if (!subject.trim()) return setError('Add a subject.');
    if (message.trim().length < 5) return setError('Write the message to send.');
    if (!channels.length) return setError('Choose at least one channel.');
    if (when === 'later') {
      if (!date) return setError('Pick a date to send on.');
      if (new Date(`${date}T${time || '08:00'}`).getTime() <= Date.now()) return setError('Pick a time in the future.');
    }
    setBusy(true);
    setError(null);
    try {
      await consoleApi.sendBroadcast({
        audience: audience.id,
        channels,
        subject: subject.trim(),
        message: message.trim(),
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        organizationId,
      });
      toast.success(scheduledFor ? 'Broadcast scheduled' : 'Broadcast queued');
      reset();
      onSent('broadcast');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send broadcast'));
    } finally {
      setBusy(false);
    }
  };

  const saveCircular = async () => {
    if (cTitle.trim().length < 3) return setError('Give the circular a title.');
    if (cBody.trim().length < 10) return setError('Write the circular text.');
    const chosen = audienceList.find((a) => a.id === cAudience) ?? audienceList[0];
    setBusy(true);
    setError(null);
    try {
      await consoleApi.createCircular({
        title: cTitle.trim(),
        audience: chosen.label,
        body: cBody.trim(),
        status: cAction === 'publish' ? 'published' : 'draft',
        organizationId,
      });
      toast.success(cAction === 'publish' ? 'Circular published' : 'Draft saved');
      reset();
      onSent('circular');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save circular'));
    } finally {
      setBusy(false);
    }
  };

  const submitLabel = isBroadcast
    ? scheduledFor
      ? 'Schedule broadcast'
      : audience.recipients
        ? `Send to ${formatNumber(audience.recipients)} ${audience.label.toLowerCase()}`
        : 'Send broadcast'
    : cAction === 'publish'
      ? 'Publish circular'
      : 'Save draft';

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title="Create"
      busy={busy}
      error={error}
      submitLabel={submitLabel}
      submitIcon={isBroadcast && !scheduledFor ? <SendIcon sx={{ fontSize: 18 }} /> : undefined}
      submitDisabled={isBroadcast ? !subject.trim() || !message.trim() : !cTitle.trim() || !cBody.trim()}
      onSubmit={() => void (isBroadcast ? sendBroadcast() : saveCircular())}
      header={
        <SegmentedTabs
          value={mode}
          onChange={(m) => {
            setError(null);
            onMode(m);
          }}
          options={[
            { value: 'broadcast', label: 'Broadcast' },
            { value: 'circular', label: 'Circular' },
          ]}
        />
      }
    >
      {isBroadcast ? (
        <Box>
          <ChipSelect
            label="Send to"
            value={audienceId}
            onChange={setAudienceId}
            options={audienceList.map((a) => ({ value: a.id, label: a.recipients ? `${a.label} · ${formatNumber(a.recipients)}` : a.label }))}
          />
          <ChipSelect
            label="Channels"
            multiple
            value={channels}
            onChange={(v) => setChannels((cur) => (cur.includes(v) ? cur.filter((c) => c !== v) : [...cur, v]))}
            options={availableChannels}
            helper={channels.includes('sms') ? `SMS is billed per message. This text is ${smsParts} SMS part${smsParts > 1 ? 's' : ''}.` : undefined}
          />
          {templates.length ? (
            <ChipSelect
              label="Start from a template"
              value=""
              onChange={(id) => {
                const t = templates.find((x) => x.id === id);
                if (!t) return;
                setSubject((s) => s || t.name);
                setMessage(t.body);
              }}
              options={templates.map((t) => ({ value: t.id, label: t.name }))}
            />
          ) : null}
          <FormField label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Reopening date for Term 3" maxLength={100} autoFocus />
          <FormField label="Message" value={message} onChange={setMessage} placeholder="Write the message people will receive…" multiline minRows={4} maxLength={600} />
          <SegmentedTabs
            value={when}
            onChange={setWhen}
            options={[
              { value: 'now', label: 'Send now' },
              { value: 'later', label: 'Schedule' },
            ]}
          />
          {when === 'later' ? (
            <FormRow>
              <FormField label="Date" value={date} onChange={setDate} type="date" />
              <FormField label="Time" value={time} onChange={setTime} type="time" helper={date && date < todayKey() ? 'That date has passed.' : undefined} />
            </FormRow>
          ) : null}
        </Box>
      ) : (
        <Box>
          <FormField label="Title" value={cTitle} onChange={setCTitle} placeholder="e.g. Term 3 calendar and fee deadlines" maxLength={120} autoFocus />
          <ChipSelect
            label="Audience"
            value={cAudience}
            onChange={setCAudience}
            options={audienceList.map((a) => ({ value: a.id, label: a.label }))}
          />
          <FormField label="Circular" value={cBody} onChange={setCBody} placeholder="Write the full circular…" multiline minRows={7} maxLength={3000} />
          <SegmentedTabs
            value={cAction}
            onChange={setCAction}
            options={[
              { value: 'publish', label: 'Publish now' },
              { value: 'draft', label: 'Save as draft' },
            ]}
          />
        </Box>
      )}
    </FormSheet>
  );
}
