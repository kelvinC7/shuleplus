export function StatusBar({ clock }) {
  return (
    <div className="statusbar">
      <span id="clock">{clock}</span>
      <span className="icons">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="#fff">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12">
          <rect x=".5" y=".5" width="22" height="11" rx="3.5" stroke="#fff" fill="none" opacity=".5" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="#fff" />
          <rect x="23.5" y="4" width="2" height="4" rx="1" fill="#fff" opacity=".5" />
        </svg>
      </span>
    </div>
  );
}
