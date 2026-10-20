import type { SuperAdminNavItem } from './nav-config';
import type { RootAdminNavItem } from '../root-admin/nav-config';

type NavIconName = SuperAdminNavItem['icon'] | RootAdminNavItem['icon'];

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function NavIcon({ name }: { name: NavIconName }) {
  switch (name) {
    case 'dashboard':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case 'organizations':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
        </svg>
      );
    case 'approvals':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'admins':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'customers':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'modules':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'subscriptions':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case 'notifications':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'reports':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      );
    case 'analytics':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      );
    case 'support':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'security':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'activity':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'settings':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      );
    case 'profile':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'health':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case 'control':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case 'smartAccess':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'smartCards':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case 'smsBulk':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          <path d="M9 10h6M9 14h4" />
        </svg>
      );
    default:
      return null;
  }
}
