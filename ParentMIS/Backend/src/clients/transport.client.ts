import { env } from '../config/env';
import { isModuleDown, markModuleDown, markModuleUp } from './module-circuit';

export type ChildTransport = {
  subscriptionStatus: string;
  transportMode: string;
  routeDetails: string;
  busNumber: string;
  driverName: string;
  driverPhone: string;
  pickupTime: string;
  pickupStop: string;
  liveState: string | null;
};

export async function getChildTransport(
  organizationId: string,
  studentCode: string
): Promise<ChildTransport | null> {
  if (isModuleDown('transport')) return null;
  try {
    const url = new URL(`${env.TRANSPORT_API_URL}/service/child-tracking`);
    url.searchParams.set('organizationId', organizationId);
    url.searchParams.set('studentCode', studentCode);
    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'parentmis',
        'x-organization-id': organizationId,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const data = json.data ?? json;
    const assignment = data.student;
    if (!assignment) return null;
    markModuleUp('transport');

    const bus = assignment.morningBus ?? assignment.afternoonBus;
    const route = assignment.route ?? bus?.route;
    const driver = bus?.driver;
    const stop = assignment.pickupStop;
    const hasRoute = Boolean(route?.name || bus?.code || assignment.routeId);

    return {
      subscriptionStatus: assignment.transportSuspended
        ? 'Suspended'
        : hasRoute
          ? 'Active Subscription'
          : 'No Subscription',
      transportMode: bus?.busType || (hasRoute ? 'School Bus' : 'Private'),
      routeDetails: route?.name || route?.direction || '',
      busNumber: [bus?.code, bus?.plateNumber].filter(Boolean).join(' · '),
      driverName: driver?.name || '',
      driverPhone: driver?.phone || '',
      pickupTime: stop?.etaMinutes != null ? `${stop.etaMinutes} min` : '',
      pickupStop: stop?.name || '',
      liveState: assignment.liveState ?? data.trip?.status ?? null,
    };
  } catch (err) {
    markModuleDown('transport', err);
    return null;
  }
}
