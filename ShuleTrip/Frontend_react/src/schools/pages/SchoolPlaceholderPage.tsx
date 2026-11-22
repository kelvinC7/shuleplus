import { useLocation } from 'react-router-dom';
import { PageHeader, PlaceholderPanel } from '@/shared/layouts/portal-shell';

export default function SchoolPlaceholderPage() {
  const { pathname } = useLocation();
  const segment = pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Section';

  return (
    <div>
      <PageHeader title={segment.replace(/\b\w/g, (c) => c.toUpperCase())} />
      <PlaceholderPanel
        title="Coming in Stage 3"
        body="Navigation and layout match the ShuleTrip product spec. This screen will be wired to live APIs, Student Management data, and the approval workflow next."
      />
    </div>
  );
}
