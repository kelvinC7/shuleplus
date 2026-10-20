'use client';

import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/labeled-input';
import { type OrgUser, orgAdminApi } from '@/lib/org-admin-api';

interface ResetPasswordDialogProps {
  user: OrgUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
  onError,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setConfirm('');
    setSendEmail(true);
    setAutoGenerate(false);
  }, [open, user?.id]);

  async function handleSubmit() {
    if (!user) return;

    if (!autoGenerate) {
      if (password.trim().length < 8) {
        onError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        onError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data } = await orgAdminApi.resetPassword(user.id, {
        password: autoGenerate ? undefined : password.trim(),
        sendEmail,
      });
      onSuccess(
        data.data.emailSent
          ? `Password updated and emailed to ${user.email}.`
          : `Password set. Temporary password: ${data.data.tempPassword}`
      );
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to reset password';
      onError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-navy">
            <KeyRound className="size-4 text-primary" />
            Reset password
          </DialogTitle>
          <DialogDescription>
            {user
              ? `Set a new password for ${user.firstName} ${user.lastName} (${user.email}).`
              : 'Set a new password for this user.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-slate-50/80 px-3 py-2.5 text-sm">
            <Checkbox
              checked={autoGenerate}
              onCheckedChange={(v) => setAutoGenerate(Boolean(v))}
            />
            <span className="text-navy">Auto-generate a temporary password</span>
          </label>

          {!autoGenerate ? (
            <div className="space-y-3">
              <Input
                label="New password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 12 characters"
                autoComplete="new-password"
              />
              <Input
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
              <p className="text-[11px] text-muted-foreground">
                Use at least 12 characters. Share this password securely with the user.
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              A secure temporary password will be generated
              {sendEmail ? ' and emailed to the user' : ' and shown once after save'}.
            </p>
          )}

          <label className="flex items-center gap-3 text-sm">
            <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(Boolean(v))} />
            <span className="text-navy">Email credentials to the user</span>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Saving…' : 'Set password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
