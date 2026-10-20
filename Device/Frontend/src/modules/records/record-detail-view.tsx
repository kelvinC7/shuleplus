'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, MessageSquare, Paperclip, Clock } from 'lucide-react';

import { ModuleHeader } from '@/components/layout/module-header';
import { StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { enrichRecord } from '@/data/mock';
import { api } from '@/services/api';
import type { SampleRecord } from '@/types';

const TIMELINE = [
  { time: 'Today, 08:15', event: 'Record created', user: 'You' },
  { time: 'Today, 08:20', event: 'Status changed to Pending', user: 'System' },
  { time: 'Today, 09:00', event: 'Assigned to Finance team', user: 'Jean Ishimwe' },
  { time: 'Yesterday', event: 'Draft saved', user: 'You' },
];

const ATTACHMENTS = [
  { name: 'budget-draft-v2.pdf', size: '2.4 MB', date: 'Jul 7, 2026' },
  { name: 'supporting-data.xlsx', size: '890 KB', date: 'Jul 6, 2026' },
];

export function RecordDetailView({ id }: { id: string }) {
  const [record, setRecord] = useState<SampleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');

  useEffect(() => {
    api
      .get('/records')
      .then((res) => {
        const found = (res.data.data as SampleRecord[]).find((r) => r.id === id);
        setRecord(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading record…</p>;
  if (!record) {
    return (
      <div className="rounded-[16px] border border-border/60 bg-card p-8 text-center shadow-soft">
        <p className="text-lg font-semibold text-foreground">Record not found</p>
        <Link href="/records">
          <Button className="mt-4">Back to Records</Button>
        </Link>
      </div>
    );
  }

  const enriched = enrichRecord(record);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={record.title}
        breadcrumbs={['Home', 'Records', record.title]}
        backHref="/records"
        icon={<FileIcon />}
        iconClassName="bg-violet-500"
        actions={
          <>
            <StatusBadge status={enriched.status} />
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 size-4" />
              Export
            </Button>
            <Button size="sm">Edit Record</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Department', value: enriched.department },
          { label: 'Priority', value: enriched.priority },
          { label: 'Owner', value: enriched.owner },
          { label: 'Created', value: new Date(record.createdAt).toLocaleDateString() },
        ].map((item) => (
          <Card key={item.label} className="shadow-soft">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-semibold text-foreground">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {record.description ?? 'No description provided for this record.'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card className="shadow-soft">
            <CardContent className="space-y-4 p-6">
              {TIMELINE.map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Clock className="size-4" />
                    </div>
                    {i < TIMELINE.length - 1 ? <div className="w-px flex-1 bg-border" /> : null}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-foreground">{item.event}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.user} · {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <Card className="shadow-soft">
            <CardContent className="space-y-3 p-6">
              {ATTACHMENTS.map((file) => (
                <div key={file.name} className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Paperclip className="size-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size} · {file.date}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="size-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full">Upload Attachment</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card className="shadow-soft">
            <CardContent className="space-y-4 p-6">
              <div className="flex gap-3 rounded-xl bg-muted/40 p-4">
                <MessageSquare className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Jean Ishimwe</p>
                  <p className="text-sm text-muted-foreground">Please review the budget figures before approval.</p>
                  <p className="mt-1 text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="flex-1" />
                <Button disabled={!comment.trim()}>Post</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FileIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
