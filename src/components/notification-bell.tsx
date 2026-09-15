"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import {
  clearNotifications,
  markNotificationsRead,
} from "@/app/(dashboard)/notifications-actions";
import type { AppNotification } from "@/types/database";

export function NotificationBell({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: AppNotification[];
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev].slice(0, 20));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleOpenChange(open: boolean) {
    if (!open && unreadCount > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      markNotificationsRead();
    }
  }

  function handleClear() {
    setNotifications([]);
    clearNotifications();
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.625rem] font-medium text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 max-w-[90vw]">
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-xs font-medium text-muted-foreground">Notifications</span>
          {notifications.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-1.5 py-3 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex-col items-start gap-0.5 whitespace-normal py-2"
              onClick={() => router.push(`/bugs/${notification.bug_id}`)}
            >
              <div className="flex w-full items-start gap-2">
                {!notification.read_at ? (
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                ) : (
                  <span className="mt-1.5 size-1.5 shrink-0" />
                )}
                <p className="text-sm leading-snug">{notification.message}</p>
              </div>
              <p className="pl-3.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
