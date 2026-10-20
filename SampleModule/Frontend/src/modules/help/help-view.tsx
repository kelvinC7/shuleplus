import Link from 'next/link';
import { BookOpen, ExternalLink, FileText, MessageCircle, Video } from 'lucide-react';

import { ModuleHeader } from '@/components/layout/module-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DOCS = [
  { title: 'Getting Started', desc: 'Set up your organization and first records', icon: BookOpen, href: '#' },
  { title: 'Records Management', desc: 'Create, edit, and manage tenant records', icon: FileText, href: '#' },
  { title: 'User & Permissions', desc: 'Manage users and module access', icon: MessageCircle, href: '#' },
  { title: 'Video Tutorials', desc: 'Watch step-by-step walkthroughs', icon: Video, href: '#' },
];

const FAQ = [
  { q: 'How does tenant isolation work?', a: 'All data is scoped to your organization ID. Users remain in IAM — only references are stored here.' },
  { q: 'How do I add new users?', a: 'Organization admins can add users from the Users page and assign module access.' },
  { q: 'Can I export my data?', a: 'Yes. Use the Export button on the Records page or Analytics reports page.' },
  { q: 'How do I contact support?', a: 'Email support@shuleplus.com or use the in-app chat (coming soon).' },
];

export function HelpView() {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Help & Documentation"
        breadcrumbs={['Home', 'Help']}
        backHref="/dashboard"
        icon={<BookOpen className="size-5" />}
        iconClassName="bg-info"
        actions={
          <Link href="/design">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 size-4" />
              Design System
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {DOCS.map((doc) => (
          <Card key={doc.title} className="shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <doc.icon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">{doc.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{doc.desc}</p>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="link" className="h-auto p-0 text-primary">Read more →</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="border-b border-border/40 pb-4 last:border-0 last:pb-0">
              <p className="text-sm font-semibold text-foreground">{item.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
