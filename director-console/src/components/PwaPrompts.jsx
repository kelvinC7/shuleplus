import { useEffect, useRef, useState } from 'react';
import { OPEN_INSTALL_EVENT, isIPad, isInAppBrowser, isIOSSafari, rememberDismissed, shouldShowInstallPrompt, useServiceWorkerUpdate, usePwaInstall } from '../utils/pwa';

const NAVY = '#13213D';
const AMBER = '#F5A623';

const ShareGlyph = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
  </svg>
);
const AddSquareGlyph = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" />
  </svg>
);
const DotsGlyph = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
);
const KebabGlyph = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
);

function Step({ n, icon, children }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ marginTop: 2, width: 28, height: 28, flexShrink: 0, borderRadius: 999, background: AMBER, color: NAVY, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>{n}</span>
      <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.4, color: '#e2e8f0' }}>{children}</div>
      {icon ? <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, background: 'rgba(255,255,255,.1)', color: '#fff', display: 'grid', placeItems: 'center' }}>{icon}</span> : null}
    </li>
  );
}

function InstallSheet({ platform, canPromptNatively, onInstall, onClose }) {
  const primaryRef = useRef(null);
  const ipad = isIPad();
  const safari = isIOSSafari();
  const inApp = isInAppBrowser();
  const isIOS = platform === 'ios';
  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} />
      <div role="dialog" aria-modal="true" aria-labelledby="pwa-title" style={{ position: 'relative', width: '100%', maxWidth: 440, borderRadius: '28px 28px 0 0', color: '#fff', boxShadow: '0 -20px 50px rgba(0,0,0,.35)', background: `linear-gradient(160deg, #1B2D52 0%, ${NAVY} 60%, #0B1220 100%)`, padding: '10px 20px max(18px, env(safe-area-inset-bottom))', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="grab" style={{ marginBottom: 12 }} />
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', right: 14, top: 18, width: 30, height: 30, borderRadius: 999, border: 0, background: 'rgba(255,255,255,.12)', color: '#cbd5e1', fontSize: 18, cursor: 'pointer' }}>×</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 28 }}>
          <img src="/yellow-icon.png" alt="" style={{ width: 56, height: 56, borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.25)' }} />
          <div>
            <h2 id="pwa-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Install Director&apos;s Console</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#cbd5e1' }}>Add it to your home screen for fast, full-screen access.</p>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          {isIOS ? (
            inApp ? (
              <div style={{ borderRadius: 16, background: 'rgba(255,255,255,.1)', padding: 14, fontSize: 13, lineHeight: 1.45, color: '#e2e8f0' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>Open this page in Safari first</p>
                <p style={{ margin: '6px 0 0' }}>This browser can&apos;t add apps to your Home Screen. Tap <DotsGlyph /> or &quot;Open in browser&quot;, choose <b>Safari</b>, then follow the steps below.</p>
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#94a3b8' }}>3 quick steps on {ipad ? 'iPad' : 'iPhone'} (Safari)</p>
                <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Step n="1" icon={<ShareGlyph />}>Tap the <b>Share</b> button {safari ? <>in Safari&apos;s {ipad ? 'top' : 'bottom'} bar</> : <>next to the address bar</>}.<span style={{ display: 'block', fontSize: 11.5, color: '#94a3b8' }}>Don&apos;t see it? Tap <b>•••</b> or <b>aA</b> first.</span></Step>
                  <Step n="2" icon={<AddSquareGlyph />}>Scroll down and tap <b>Add to Home Screen</b>.</Step>
                  <Step n="3">Tap <b style={{ color: AMBER }}>Add</b> (top right), then open <b>Director</b> from your Home Screen.</Step>
                </ol>
                <p style={{ margin: '14px 0 0', borderRadius: 12, background: 'rgba(255,255,255,.06)', padding: '10px 12px', fontSize: 11.5, lineHeight: 1.45, color: '#94a3b8' }}>On iPhone/iPad, install from Safari to add the app to your Home Screen with its own icon.</p>
              </>
            )
          ) : canPromptNatively ? (
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: '#cbd5e1' }}>Install the app for faster access and a full-screen experience. No app store needed.</p>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Step n="1" icon={<KebabGlyph />}>Open your browser menu <b>⋮</b>.</Step>
              <Step n="2">Tap <b>Install app</b> or <b>Add to Home screen</b>.</Step>
              <Step n="3">Confirm, then open <b>Director&apos;s Console</b> from your home screen.</Step>
            </ol>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {!isIOS && canPromptNatively ? (
            <button ref={primaryRef} onClick={onInstall} style={{ flex: 1, height: 48, borderRadius: 14, border: 0, background: AMBER, color: NAVY, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Install app</button>
          ) : (
            <button ref={primaryRef} onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 14, border: 0, background: AMBER, color: NAVY, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Got it</button>
          )}
          <button onClick={onClose} style={{ height: 48, borderRadius: 14, border: 0, background: 'rgba(255,255,255,.12)', color: '#e2e8f0', fontSize: 14, fontWeight: 700, padding: '0 18px', cursor: 'pointer' }}>Not now</button>
        </div>
        {isIOS && safari && !inApp ? <div aria-hidden="true" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, color: AMBER, fontSize: 28, ...(ipad ? { top: 6 } : { bottom: 4 }) }}>{ipad ? '▲' : '▼'}</div> : null}
      </div>
    </div>
  );
}

function UpdateBanner({ onApply, onDismiss }) {
  return (
    <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'max(16px, env(safe-area-inset-bottom))', zIndex: 9998, width: 'calc(100% - 24px)', maxWidth: 420 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 16, padding: '12px 14px', color: '#fff', background: NAVY, boxShadow: '0 10px 30px rgba(0,0,0,.25)' }}>
        <p style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 600 }}>A new version is ready.</p>
        <button onClick={onApply} style={{ border: 0, borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 800, background: AMBER, color: NAVY, cursor: 'pointer' }}>Refresh</button>
        <button onClick={onDismiss} aria-label="Dismiss" style={{ border: 0, background: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>×</button>
      </div>
    </div>
  );
}

export default function PwaPrompts() {
  const { installed, platform, canPromptNatively, install } = usePwaInstall();
  const { updateReady, applyUpdate, dismiss } = useServiceWorkerUpdate();
  const [open, setOpen] = useState(false);
  const autoShown = useRef(false);
  useEffect(() => {
    if (installed || autoShown.current || !shouldShowInstallPrompt()) return;
    const eligible = platform === 'ios' || canPromptNatively || platform === 'android';
    if (!eligible) return;
    const t = setTimeout(() => { autoShown.current = true; setOpen(true); }, canPromptNatively || platform === 'ios' ? 4000 : 8000);
    return () => clearTimeout(t);
  }, [installed, platform, canPromptNatively]);
  useEffect(() => {
    const on = () => !installed && setOpen(true);
    window.addEventListener(OPEN_INSTALL_EVENT, on);
    return () => window.removeEventListener(OPEN_INSTALL_EVENT, on);
  }, [installed]);
  const close = () => { setOpen(false); rememberDismissed(); };
  const doInstall = async () => { await install(); setOpen(false); };
  return (<>
    {open && !installed ? <InstallSheet platform={platform} canPromptNatively={canPromptNatively} onInstall={doInstall} onClose={close} /> : null}
    {updateReady ? <UpdateBanner onApply={applyUpdate} onDismiss={dismiss} /> : null}
  </>);
}
