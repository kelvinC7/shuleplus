import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? window.location.origin).replace(/\/$/, '');

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
