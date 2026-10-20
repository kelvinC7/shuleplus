'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * USB serial vendor IDs commonly used by ShulePlus card readers.
 * XIAO ESP32-C3 native USB CDC is Espressif (0x303A) or Seeed (0x2886).
 */
const SERIAL_FILTERS: SerialPortFilter[] = [
  { usbVendorId: 0x303a }, // Espressif (ESP32-C3 / ESP32-S3 native USB)
  { usbVendorId: 0x2886 }, // Seeed Studio (XIAO)
  { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
  { usbVendorId: 0x1a86 }, // QinHeng CH340
  { usbVendorId: 0x0403 }, // FTDI
];

type CardHandler = (uid: string) => void;

type WebSerialRfidContextValue = {
  connected: boolean;
  status: string | null;
  lastUid: string | null;
  supported: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  registerCardHandler: (handler: CardHandler | null) => void;
};

const WebSerialRfidContext = createContext<WebSerialRfidContextValue | null>(null);

export function WebSerialRfidProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastUid, setLastUid] = useState<string | null>(null);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const cardHandlerRef = useRef<CardHandler | null>(null);

  const disconnect = useCallback(async () => {
    try {
      await readerRef.current?.cancel();
    } catch {
      /* ignore */
    }
    readerRef.current = null;
    try {
      await portRef.current?.close();
    } catch {
      /* ignore */
    }
    portRef.current = null;
    setConnected(false);
    setStatus(null);
  }, []);

  // Only tear down when leaving Smart Access (provider unmount), not when drawers remount.
  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      setStatus('Use Chrome or Edge on desktop to connect a card reader.');
      return;
    }
    if (portRef.current) {
      setConnected(true);
      setStatus('Reader connected. Scan a card');
      return;
    }
    try {
      const port = await navigator.serial.requestPort({ filters: SERIAL_FILTERS });
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setConnected(true);
      setStatus('Reader connected. Scan a card');

      const decoder = new TextDecoderStream();
      port.readable?.pipeTo(decoder.writable).catch(() => undefined);
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      let buffer = '';
      (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value ?? '';
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('CARD:')) {
              const uid = trimmed.slice(5).trim().toUpperCase();
              if (!uid) continue;
              setLastUid(uid);
              setStatus(`Card ${uid}`);
              cardHandlerRef.current?.(uid);
            } else if (trimmed.startsWith('STEP:')) {
              setStatus(trimmed.slice(5).replace(/_/g, ' '));
            }
          }
        }
      })().catch(() => undefined);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotFoundError') {
        setStatus('No USB reader found. Plug in the XIAO, then try again.');
      } else if (name === 'SecurityError') {
        setStatus('Serial access blocked. Use Chrome/Edge on http://localhost or HTTPS.');
      } else if (name === 'InvalidStateError') {
        setConnected(true);
        setStatus('Reader already open. Scan a card');
      } else {
        setStatus('Could not connect to the reader. Close Arduino Serial Monitor and retry.');
      }
    }
  }, []);

  const registerCardHandler = useCallback((handler: CardHandler | null) => {
    cardHandlerRef.current = handler;
  }, []);

  const value = useMemo<WebSerialRfidContextValue>(
    () => ({
      connected,
      status,
      lastUid,
      supported: typeof navigator !== 'undefined' && 'serial' in navigator,
      connect,
      disconnect,
      registerCardHandler,
    }),
    [connected, status, lastUid, connect, disconnect, registerCardHandler]
  );

  return createElement(WebSerialRfidContext.Provider, { value }, children);
}

/** Shared Smart Access reader session. Optional onCard registers while this consumer is mounted. */
export function useWebSerialRfid(onCard?: (uid: string) => void) {
  const ctx = useContext(WebSerialRfidContext);
  if (!ctx) {
    throw new Error('useWebSerialRfid must be used within WebSerialRfidProvider');
  }

  const onCardRef = useRef(onCard);
  onCardRef.current = onCard;

  useEffect(() => {
    if (!onCard) return;
    const handler: CardHandler = (uid) => onCardRef.current?.(uid);
    ctx.registerCardHandler(handler);
    return () => {
      ctx.registerCardHandler(null);
    };
  }, [onCard, ctx]);

  return ctx;
}
