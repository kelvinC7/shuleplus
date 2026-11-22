import { useState } from 'react';
import { cams, zones } from '../data/cams';
import { CameraGrid } from './CameraGrid';

export function LiveView({ scope, setScope, onOpenCam, showToast, onOpenBuses, onOpenGuards }) {
  const [zone, setZone] = useState('All');

  return (
    <section className="view active" id="v-live">
      <div className="ph">
        <div className="toprow">
          <div className="school">
            <div className="crest">SM</div>
            <div>
              <small>SECURITY</small>
              <b>Live Campus</b>
            </div>
          </div>
          <button
            className="iconbtn"
            onClick={() => showToast('Recording all cameras for 10 min')}
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" fill="#E5484D" stroke="none" />
            </svg>
          </button>
        </div>
        <button className="scopechip" onClick={() => showToast('Switch school')}>
          {scope === 'all' ? 'All 6 schools ▾' : 'School ▾'}
        </button>
        <h2>24 cameras · 23 online</h2>
        <p>Gate counts from Digital Attendance, bus positions from Smart Transport</p>
        <div className="seg" id="zones">
          {zones.map((z) => (
            <button
              key={z}
              className={z === zone ? 'on' : ''}
              onClick={() => setZone(z)}
            >
              {z}
            </button>
          ))}
        </div>
      </div>
      <div className="livebar">
        <div className="card">
          <span className="chip green">IN</span>
          <div>
            <b>1,212</b>
            <small>People on campus</small>
          </div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onOpenBuses?.()}>
          <span className="chip amber">GPS</span>
          <div>
            <b>6 / 7</b>
            <small>Buses on route ›</small>
          </div>
        </div>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onOpenGuards?.()}>
          <span className="chip navy">ON</span>
          <div>
            <b>7 on duty</b>
            <small>Guards ›</small>
          </div>
        </div>
      </div>
      <CameraGrid cams={cams} zone={zone} onOpen={onOpenCam} />
    </section>
  );
}
