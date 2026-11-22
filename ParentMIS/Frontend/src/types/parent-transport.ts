export type ParentTransportPortalResponse = {
  student: { id: string; shuleCode: string; fullName: string; className: string };
  unreadTransportNotifications: number;
  changeRequests: TransportChangeRequest[];
  portal: TransportPortalPayload;
};

export type TransportChangeRequest = {
  id: string;
  requestType: string;
  reason: string;
  status: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  schoolResponse: string | null;
  createdAt: string;
};

export type TransportPortalPayload =
  | { enrolled: false; studentCode: string; linkStatus?: 'unreachable' | 'no_assignment' }
  | {
      enrolled: true;
      student: { studentCode: string; studentName: string; className: string | null; liveState: string; suspended: boolean };
      assignment: {
        routeName: string;
        routeCode: string;
        schoolName: string;
        departureTime: string | null;
        arrivalTime: string | null;
        pickup: TransportStop | null;
        dropoff: TransportStop | null;
      };
      bus: { code: string; plateNumber: string; busType: string } | null;
      staff: {
        driver: { name: string; phone: string | null; vehicle: string } | null;
        supervisor: { name: string; phone: string | null; roleTitle: string; routeName: string } | null;
      };
      route: { id: string; name: string; color: string; stops: TransportStop[] } | null;
      todayJourney: {
        status: string;
        startedAt: string | null;
        pendingMorning: string[];
        pendingAfternoon: string[];
        note: string | null;
      };
      liveTracking: {
        latitude: number;
        longitude: number;
        recordedAt: string;
        isLive: boolean;
        stale: boolean;
      } | null;
      todayTimeline: TransportTimelineEvent[];
      history: TransportTimelineEvent[];
    };

export type TransportStop = {
  id: string;
  name: string;
  sequence: number;
  kind: string;
  plannedTime: string | null;
  landmark: string | null;
  isChildStop: boolean;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type TransportTimelineEvent = {
  id: string;
  eventType: string;
  phase: string;
  step: number;
  label: string;
  detail: string;
  scannedAt: string;
  stopName: string | null;
  method: string;
  outcome: string;
  confirmed: boolean;
  status: string;
};
