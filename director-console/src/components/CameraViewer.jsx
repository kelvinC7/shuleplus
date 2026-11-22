import { scene } from '../utils/scene';
import { I } from '../utils/icons';

export function CameraViewer({ cam, onClose, showToast }) {
  if (!cam) return null;

  return (
    <div className="viewer open" id="viewer">
      <div className="vtop">
        <div>
          <b id="vname">{cam.name}</b>
          <small id="vsub">
            Camera {String(cam.id).padStart(2, '0')} · 1080p · Encrypted
          </small>
        </div>
        <button className="iconbtn" onClick={onClose}>
          <svg viewBox="0 0 24 24">{I.x}</svg>
        </button>
      </div>
      <div className="stagecam" id="vstage">
        {cam.off ? (
          <div className="off">CAMERA OFFLINE</div>
        ) : (
          <div
            dangerouslySetInnerHTML={{
              __html: scene(cam.type, cam.id + 500),
            }}
          />
        )}
        <div className="ptz">
          <button className="u" onClick={() => showToast('Pan up')}>
            <svg viewBox="0 0 24 24">
              <path d="m6 15 6-6 6 6" />
            </svg>
          </button>
          <button className="d" onClick={() => showToast('Pan down')}>
            <svg viewBox="0 0 24 24">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <button className="l" onClick={() => showToast('Pan left')}>
            <svg viewBox="0 0 24 24">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button className="r" onClick={() => showToast('Pan right')}>
            <svg viewBox="0 0 24 24">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <i />
        </div>
      </div>
      <div className="vinfo" id="vinfo">
        {cam.info.map(([a, b]) => (
          <div key={b}>
            <b>{a}</b>
            <small>{b}</small>
          </div>
        ))}
      </div>
      <div className="vctl">
        <button onClick={() => showToast('Snapshot saved to Security log')}>
          <span className="c">
            <svg viewBox="0 0 24 24">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
          Snapshot
        </button>
        <button
          className="talk"
          onClick={(e) => {
            e.currentTarget.classList.toggle('on');
            showToast(
              e.currentTarget.classList.contains('on')
                ? 'Speaker on · talking to Gate'
                : 'Speaker off'
            );
          }}
        >
          <span className="c">
            <svg viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4" />
            </svg>
          </span>
          Talk
        </button>
        <button className="rec" onClick={() => showToast('Recording clip · 60 s')}>
          <span className="c">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" fill="#fff" />
            </svg>
          </span>
          Record
        </button>
        <a id="vcall" href="tel:+250788610102">
          <span className="c">
            <svg viewBox="0 0 24 24">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <span className="lbl">Call guard</span>
        </a>
      </div>
    </div>
  );
}
