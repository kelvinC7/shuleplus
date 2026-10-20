'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Navigation, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/services/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export default function DriverLocationPage() {
  const { profile, reload } = useAuth();
  const driverId = profile?.driverId ?? '';
  const router = useRouter();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  async function detect() {
    if (!driverId) return;
    setDetecting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation unavailable'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      setLat(String(position.coords.latitude));
      setLng(String(position.coords.longitude));
      toast.success('Location detected');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Could not get location');
    } finally {
      setDetecting(false);
    }
  }

  async function save() {
    if (!driverId) return;
    if (!lat || !lng) return toast.error('Location coordinates are required');
    setSaving(true);
    try {
      await api.put(`/drivers/${driverId}/location`, {
        lat: Number(lat),
        lng: Number(lng),
        address: address || undefined,
      });
      toast.success('Location updated');
      reload();
      router.push('/app/driver/deliveries');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  if (!driverId) {
    return <Card className="p-8 text-center text-sm text-danger">No driver profile linked to this account.</Card>;
  }

  return (
    <div>
      <PageHeader title="Update location" description="Share your live position with the canteen." />

      <div className="mx-auto max-w-md">
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">
              Current location:{' '}
              <span className="font-medium text-navy">
                {profile?.driver?.currentLocation
                  ? `${profile.driver.currentLocation.lat?.toFixed(4) ?? '—'}, ${profile.driver.currentLocation.lng?.toFixed(4) ?? '—'}`
                  : 'Not shared yet'}
              </span>
            </p>

            <Button className="w-full" onClick={detect} disabled={detecting}>
              {detecting ? 'Detecting…' : (
                <>
                  <Navigation /> Use my GPS position
                </>
              )}
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="h-px flex-1 bg-border" /> or enter manually <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-1.9441" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="30.0619" />
              </div>
            </div>
            <div>
              <Label>Address (optional)</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Kigali, Gasabo…" />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-navy">
              <MapPin className="h-4 w-4 text-primary" /> Your location is attached to deliveries you start or complete.
            </div>

            <Button className="w-full" variant="success" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save location'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
