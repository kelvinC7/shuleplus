export type InAppNotificationRecord = {
  id: string;
  userId: string;
  title: string;
  body: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  read: boolean;
  archived: boolean;
  createdAt: string;
};

const notifications: InAppNotificationRecord[] = [];

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const embeddedNotificationsService = {
  sendInApp(params: {
    userId: string;
    title: string;
    body: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    actionUrl?: string;
  }) {
    const record: InAppNotificationRecord = {
      id: nextId('inapp'),
      userId: params.userId,
      title: params.title,
      body: params.body,
      priority: params.priority ?? 'NORMAL',
      actionUrl: params.actionUrl,
      read: false,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(record);
    return { id: record.id, delivered: true as const };
  },

  listInApp(userId: string, filter: 'all' | 'unread' | 'archived' = 'all') {
    let rows = notifications.filter((n) => n.userId === userId);
    if (filter === 'unread') rows = rows.filter((n) => !n.read && !n.archived);
    if (filter === 'archived') rows = rows.filter((n) => n.archived);
    else rows = rows.filter((n) => !n.archived);
    return rows;
  },

  unreadCount(userId: string) {
    const count = notifications.filter((n) => n.userId === userId && !n.read && !n.archived).length;
    return { count };
  },

  markRead(id: string, userId: string) {
    const row = notifications.find((n) => n.id === id && n.userId === userId);
    if (row) row.read = true;
  },

  markAllRead(userId: string) {
    for (const row of notifications) {
      if (row.userId === userId && !row.archived) row.read = true;
    }
  },

  archive(id: string, userId: string) {
    const row = notifications.find((n) => n.id === id && n.userId === userId);
    if (row) {
      row.archived = true;
      row.read = true;
    }
  },
};
