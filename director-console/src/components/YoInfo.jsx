import { useState, useEffect, useCallback, useRef } from 'react';
import { YO } from '../data/yo';
import { YOC } from '../data/yoc';
import { SC } from '../data/sc';

const kfmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n));
const YDUR = 8000;

export function YoInfo({ onClose, showToast }) {
  const [tab, setTab] = useState('for');
  const [idx, setIdx] = useState(0);
  const [el, setEl] = useState(0);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [extra, setExtra] = useState({});
  const [sheet, setSheet] = useState('');
  const [hold, setHold] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const timer = useRef(null);

  const list = tab === 'for' ? [1, 4, 2, 5, 7, 3, 6].map((i) => YO.find((s) => s.id === i)).filter(Boolean) : [...YO];
  const s = list[idx] || list[0];

  const go = useCallback(
    (n) => {
      const i = idx + n;
      if (i < 0) {
        setEl(0);
        return;
      }
      if (i >= list.length) {
        onClose();
        return;
      }
      setFlipping(true);
      setTimeout(() => {
        setIdx(i);
        setEl(0);
        setFlipping(false);
      }, 280);
    },
    [idx, list.length, onClose]
  );

  useEffect(() => {
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      if (hold || sheet) return;
      setEl((e) => {
        if (e + 100 >= YDUR) {
          go(1);
          return 0;
        }
        return e + 100;
      });
    }, 100);
    return () => clearInterval(timer.current);
  }, [hold, sheet, go]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
      if (e.key === 'Escape') (sheet ? setSheet('') : onClose());
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, sheet, onClose]);

  if (!s) return null;

  const likedOn = liked[s.id];
  const savedOn = saved[s.id];
  const ex = extra[s.id] || { cm: 0, sh: 0 };
  const bgHtml = typeof SC[s.bg] === 'function' ? SC[s.bg]() : '';

  return (
    <div className={`yo on ${flipping ? "flip" : ""}`} id="yo" role="dialog" aria-label="yoInfo stories">
      <div className="bgs" id="ybg" dangerouslySetInnerHTML={{ __html: bgHtml }} />
      <div className="shade" />
      <div className={`paused ${hold ? 'on' : ''}`}>
        <svg viewBox="0 0 24 24">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      </div>
      <button className="tz l" aria-label="Previous" onClick={() => go(-1)} />
      <button className="tz r" aria-label="Next" onClick={() => go(1)} />

      <div className="top">
        <div className="r1">
          <div className="tabsx">
            <button className={tab === 'for' ? 'on' : ''} onClick={() => { setTab('for'); setIdx(0); setEl(0); }}>
              For you
            </button>
            <button className={tab === 'latest' ? 'on' : ''} onClick={() => { setTab('latest'); setIdx(0); setEl(0); }}>
              Latest
            </button>
          </div>
          <button className="x" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="prog" id="yprog">
          {list.map((_, i) => (
            <i key={i} className={i < idx ? 'done' : i === idx ? 'cur' : ''}>
              <b style={{ width: i === idx ? `${Math.min(100, (el / YDUR) * 100)}%` : i < idx ? '100%' : '0' }} />
            </i>
          ))}
        </div>
        <span className="ycount">
          {idx + 1} / {list.length}
        </span>
      </div>

      <div className="rail" id="yrail">
        <button
          className={likedOn ? 'liked' : ''}
          onClick={() => setLiked((p) => ({ ...p, [s.id]: !p[s.id] }))}
        >
          <svg viewBox="0 0 24 24">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.6 1-1.1a5.5 5.5 0 0 0 0-7.7z" />
          </svg>
          <b>{kfmt(s.lk + (likedOn ? 1 : 0))}</b>
          <span>Like</span>
        </button>
        <button onClick={() => setSheet('cm')}>
          <svg viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <b>{kfmt((s.cn || s.cm || 0) + ex.cm)}</b>
          <span>Comment</span>
        </button>
        <button onClick={() => setSheet('sh')}>
          <svg viewBox="0 0 24 24">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="m16 6-4-4-4 4M12 2v13" />
          </svg>
          <b>{kfmt(s.sh + ex.sh)}</b>
          <span>Share</span>
        </button>
        <button
          className={savedOn ? 'saved' : ''}
          onClick={() => {
            setSaved((p) => ({ ...p, [s.id]: !p[s.id] }));
            showToast(!savedOn ? 'Saved to yoInfo' : 'Removed from saved');
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>{savedOn ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      <div className="info" id="yinfo">
        <div className="slide">
          <div className="src">
            <span className={`av${s.ini === 'KS' ? ' crest badge' : ''}`}>{s.ini}</span>
            <div>
              <b>{s.src.toUpperCase()}</b>
              <small>
                @{s.h} · {s.t}
              </small>
            </div>
          </div>
          <div className="ch">
            <span className="k">{s.k}</span>
            <span>{s.m}</span>
          </div>
          <h2>{s.title}</h2>
          <p className="sm">{s.sum}</p>
          <button className="read" onClick={() => setSheet('rd')}>
            Read full story{' '}
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {sheet && (
        <>
          <div className="ysc on" onClick={() => setSheet('')} />
          <div className="ysheet on">
            <div className="gb" />
            <div className="hd">
              <b>{sheet === 'cm' ? 'Comments' : sheet === 'sh' ? 'Share' : 'Full story'}</b>
              <button onClick={() => setSheet('')} aria-label="Close">
                <svg viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sheet === 'cm' && (
              <div className="bd">
                {(YOC[s.id] || []).map(([n, a, t, x], i) => (
                  <div key={i} className="cmt">
                    <span className="p">{a}</span>
                    <div>
                      <b>
                        {n}
                        <small>{t}</small>
                      </b>
                      <p>{x}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {sheet === 'sh' && (
              <div className="bd">
                <div className="shr">
                  {[
                    ['Staff group', () => showToast("Shared to the St Matthew's staff group")],
                    ['WhatsApp', () => showToast('Opening WhatsApp')],
                    ['Parents', () => showToast('Shared to parents in the parent app')],
                    [
                      'Copy link',
                      () => {
                        navigator.clipboard?.writeText('https://yoinfo.rw/s/' + s.id)?.catch(() => {});
                        showToast('Link copied');
                      },
                    ],
                  ].map(([l, a]) => (
                    <button
                      key={l}
                      onClick={() => {
                        a();
                        setExtra((p) => ({
                          ...p,
                          [s.id]: { ...(p[s.id] || { cm: 0, sh: 0 }), sh: ((p[s.id] || {}).sh || 0) + 1 },
                        }));
                        setSheet('');
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sheet === 'rd' && (
              <div className="bd art2">
                <div className="meta">
                  <span className="av">{s.ini}</span>
                  <div>
                    <b>{s.src}</b>
                    <small>
                      @{s.h} · {s.t} ago
                    </small>
                  </div>
                </div>
                <h3>{s.title}</h3>
                <div className="chs">
                  <span className="chip amber">{s.k}</span>
                  <span className="chip navy">{s.m}</span>
                </div>
                {(s.body || []).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {s.list && (
                  <ul>
                    {s.list.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                )}
                <div className="cta">
                  {(s.cta || []).map(([l], i) => (
                    <button
                      key={l}
                      className={`bigbtn ${i ? 'ghost' : 'amber'}`}
                      style={{ margin: 0 }}
                      onClick={() => {
                        showToast(l);
                        setSheet('');
                      }}
                    >
                      {l}
                    </button>
                  ))}
                  <button className="bigbtn ghost" style={{ margin: 0 }} onClick={() => setSheet('sh')}>
                    Share
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
