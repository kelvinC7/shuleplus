/** In-memory presence tracker (single instance). Swap for Redis in cluster mode. */
const userSockets = new Map<string, Set<string>>();
const socketOrg = new Map<string, string>();

function markOnline(userId: string, organizationId: string, socketId: string): void {
  let sockets = userSockets.get(userId);
  if (!sockets) {
    sockets = new Set();
    userSockets.set(userId, sockets);
  }
  sockets.add(socketId);
  socketOrg.set(socketId, organizationId);
}

/** Returns true when the user is now fully offline (no sockets left). */
function markOffline(userId: string, socketId: string): boolean {
  const sockets = userSockets.get(userId);
  if (sockets) sockets.delete(socketId);
  socketOrg.delete(socketId);
  if (!sockets || sockets.size === 0) {
    userSockets.delete(userId);
    return true;
  }
  return false;
}

function isOnline(userId: string): boolean {
  const sockets = userSockets.get(userId);
  return Boolean(sockets && sockets.size > 0);
}

function onlineCount(organizationId: string): number {
  let count = 0;
  for (const [socketId, org] of socketOrg.entries()) {
    if (org === organizationId && socketOrg.has(socketId)) count += 1;
  }
  return count;
}

function onlineUserIds(organizationId: string): string[] {
  const out = new Set<string>();
  for (const [socketId, org] of socketOrg.entries()) {
    if (org !== organizationId) continue;
    for (const [userId, sockets] of userSockets.entries()) {
      if (sockets.has(socketId)) out.add(userId);
    }
  }
  return [...out];
}

export const presence = { markOnline, markOffline, isOnline, onlineCount, onlineUserIds };
