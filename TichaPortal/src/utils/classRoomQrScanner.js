/**
 * Fast QR scan for printed ShuleCards: native BarcodeDetector when available,
 * optional snapshot decode (often sharper than live preview on mid-range phones).
 */

let hiddenScanHost;

function ensureHiddenHost() {
  if (hiddenScanHost?.isConnected) return hiddenScanHost;
  hiddenScanHost = document.createElement('div');
  hiddenScanHost.id = 'teacher-qr-hidden-scanner';
  hiddenScanHost.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px';
  document.body.appendChild(hiddenScanHost);
  return hiddenScanHost;
}

export async function applyCameraFocus(stream) {
  const track = stream?.getVideoTracks?.()?.[0];
  if (!track?.applyConstraints) return;
  try {
    await track.applyConstraints({
      advanced: [{ focusMode: 'continuous' }, { exposureMode: 'continuous' }],
    });
  } catch {
    try {
      await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
    } catch {
      /* device may not support */
    }
  }
}

export async function setTorch(stream, enabled) {
  const track = stream?.getVideoTracks?.()?.[0];
  if (!track?.applyConstraints) return false;
  const caps = track.getCapabilities?.();
  if (!caps?.torch) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: Boolean(enabled) }] });
    return true;
  } catch {
    return false;
  }
}

async function decodeFromVideoFrame(video) {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  if (w < 64 || h < 64) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);

  if (typeof BarcodeDetector !== 'undefined') {
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(canvas);
      if (codes?.[0]?.rawValue) return codes[0].rawValue;
    } catch {
      /* fall through */
    }
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) return null;

  const { Html5Qrcode } = await import('html5-qrcode');
  const host = ensureHiddenHost();
  const scanner = new Html5Qrcode(host.id, false);
  try {
    const file = new File([blob], 'snap.jpg', { type: 'image/jpeg' });
    return await scanner.scanFile(file, false);
  } catch {
    return null;
  } finally {
    try {
      await scanner.clear();
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {{ container: HTMLElement, onDecode: (text: string) => void }} opts
 */
export async function startFastQrScanner({ container, onDecode }) {
  let stopped = false;
  let lastText = '';
  let lastAt = 0;
  let animId = 0;
  let stream = null;
  let video = null;
  let useNative = false;

  const emit = (text) => {
    if (stopped) return;
    const t = String(text || '').trim();
    if (!t) return;
    const now = Date.now();
    if (t === lastText && now - lastAt < 2000) return;
    lastText = t;
    lastAt = now;
    onDecode(t);
  };

  container.innerHTML = '';
  video = document.createElement('video');
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  video.autoplay = true;
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'cover';
  container.appendChild(video);

  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280, max: 1280 },
      height: { ideal: 720, max: 1080 },
    },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  await applyCameraFocus(stream);

  if (typeof BarcodeDetector !== 'undefined') {
    useNative = true;
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    let busy = false;
    const loop = async () => {
      if (stopped) return;
      if (!busy && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        busy = true;
        try {
          const codes = await detector.detect(video);
          if (codes?.[0]?.rawValue) emit(codes[0].rawValue);
        } catch {
          /* ignore frame errors */
        }
        busy = false;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
  } else {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
    const deviceId = stream.getVideoTracks()[0]?.getSettings?.()?.deviceId;
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
    container.innerHTML = '';
    if (!container.id) {
      container.id = `qr-fallback-${Date.now()}`;
    }
    const scanner = new Html5Qrcode(container.id, false);
    const cameraConfig = deviceId
      ? { deviceId }
      : { facingMode: 'environment' };
    await scanner.start(
      cameraConfig,
      {
        fps: 18,
        qrbox: (vw, vh) => ({
          width: Math.floor(Math.min(vw, vh) * 0.96),
          height: Math.floor(Math.min(vw, vh) * 0.96),
        }),
        disableFlip: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      },
      (decoded) => emit(decoded),
      () => {},
    );
    video = container.querySelector('video');

    return {
      stream: video?.srcObject instanceof MediaStream ? video.srcObject : null,
      video,
      mode: 'html5',
      async snapScan() {
        const v = container.querySelector('video');
        if (!v) return null;
        const text = await decodeFromVideoFrame(v);
        if (text) emit(text);
        return text;
      },
      async stop() {
        stopped = true;
        try {
          await scanner.stop();
        } catch {
          /* ignore */
        }
        try {
          await scanner.clear();
        } catch {
          /* ignore */
        }
        container.innerHTML = '';
      },
    };
  }

  return {
    stream,
    video,
    mode: useNative ? 'native' : 'html5',
    async snapScan() {
      if (!video) return null;
      const text = await decodeFromVideoFrame(video);
      if (text) emit(text);
      return text;
    },
    async stop() {
      stopped = true;
      if (animId) cancelAnimationFrame(animId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
      if (video) video.srcObject = null;
      container.innerHTML = '';
    },
  };
}
