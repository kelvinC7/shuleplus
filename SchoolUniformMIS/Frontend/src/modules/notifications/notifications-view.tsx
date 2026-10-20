"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";

import { ModuleHeader } from "@/components/layout/module-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NOTIFICATIONS, type NotificationItem } from "@/data/mock";
import { cn } from "@/lib/utils";

export function NotificationsView() {
  const [items, setItems] = useState(NOTIFICATIONS);

  const unread = items.filter((n) => !n.read);
  const read = items.filter((n) => n.read);

  function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Notifications"
        breadcrumbs={["Home", "Notifications"]}
        backHref="/dashboard"
        icon={<Bell className="size-5" />}
        iconClassName="bg-primary"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={unread.length === 0}
          >
            <CheckCheck className="mr-1.5 size-4" />
            Mark All Read
          </Button>
        }
      />

      <Tabs defaultValue="unread">
        <TabsList>
          <TabsTrigger value="unread">Unread ({unread.length})</TabsTrigger>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="mt-4 space-y-3">
          {unread.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You&apos;re all caught up!
            </p>
          ) : (
            unread.map((n) => (
              <NotificationCard
                key={n.id}
                item={n}
                onRead={markRead}
                onRemove={remove}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          {items.map((n) => (
            <NotificationCard
              key={n.id}
              item={n}
              onRead={markRead}
              onRemove={remove}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationCard({
  item,
  onRead,
  onRemove,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const typeColor = {
    info: "border-l-info",
    success: "border-l-success",
    warning: "border-l-warning",
    error: "border-l-destructive",
  }[item.type];

  return (
    <Card
      className={cn(
        "border-l-4 shadow-soft",
        typeColor,
        !item.read && "bg-primary/5",
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {!item.read ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onRead(item.id)}
              title="Mark read"
            >
              <Check className="size-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(item.id)}
            title="Remove"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
