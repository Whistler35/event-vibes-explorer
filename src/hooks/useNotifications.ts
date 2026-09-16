import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data as unknown as AppNotification[]);
      setUnreadCount((data as any[]).filter((n) => !n.is_read).length);
    }
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    if (!user) return;

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as unknown as AppNotification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
}

/**
 * Mark every notification tied to one chat thread as read, e.g. when the
 * user opens a Huddle or DM and reads the latest message — older
 * "new message" notifications for that same thread would otherwise sit in
 * the bell as unread forever, even though the user has already seen them
 * in context.
 */
export async function markHuddleNotificationsRead(userId: string, matchId: string) {
  await supabase
    .from("notifications")
    .update({ is_read: true } as any)
    .eq("user_id", userId)
    .eq("type", "blitz_chat_message")
    .eq("is_read", false)
    .eq("data->>match_id", matchId);
}

export async function markDmNotificationsRead(userId: string, conversationId: string) {
  await supabase
    .from("notifications")
    .update({ is_read: true } as any)
    .eq("user_id", userId)
    .eq("type", "new_dm")
    .eq("is_read", false)
    .eq("data->>conversation_id", conversationId);
}
