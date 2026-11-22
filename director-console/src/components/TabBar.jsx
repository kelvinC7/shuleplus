import { I } from '../utils/icons';

export function TabBar({ active, onChange, approvalCount = 0 }) {
  return (
    <nav className="tabbar">
      <button
        className={`tab ${active === 'home' ? 'active' : ''}`}
        onClick={() => onChange('home')}
      >
        <svg viewBox="0 0 24 24">{I.home}</svg>
        Home
      </button>
      <button
        className={`tab ${active === 'approve' ? 'active' : ''}`}
        onClick={() => onChange('approve')}
      >
        {approvalCount > 0 && (
          <span className="badge" id="apbadge">
            {approvalCount}
          </span>
        )}
        <svg viewBox="0 0 24 24">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        Approve
      </button>
      <button className="yofab" onClick={() => onChange('yo')} aria-label="yoInfo stories">
        <span className="yc">
          <svg viewBox="0 0 24 24">
            <path
              d="M6.5 3h11A3.5 3.5 0 0 1 21 6.5v9a3.5 3.5 0 0 1-3.5 3.5H17l1.2 3.2L14 19H6.5A3.5 3.5 0 0 1 3 15.5v-9A3.5 3.5 0 0 1 6.5 3z"
              fill="#fff"
            />
            <circle cx="12" cy="7.6" r="1.7" fill="#C0077C" />
            <path
              d="M9.8 10.6h2.9v5.2M9.6 15.9h5"
              stroke="#C0077C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </span>
        yoInfo
      </button>
      <button
        className={`tab ${active === 'insights' ? 'active' : ''}`}
        onClick={() => onChange('insights')}
      >
        <svg viewBox="0 0 24 24">{I.chart}</svg>
        Insights
      </button>
      <button
        className={`tab ${active === 'console' ? 'active' : ''}`}
        onClick={() => onChange('console')}
      >
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        Console
      </button>
    </nav>
  );
}
