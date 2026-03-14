import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks unread direct messages.
 * Uses a simple "last_read" timestamp stored in localStorage per conversation.
 */
export function useUnreadDMCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const computeCount = async () => {
    if (!user) {
      setCount(0);
      return;
    }

    // Get all conversations for this user
    const { data: convos } = await supabase
      .from("direct_conversations")
      .select("id")
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    if (!convos || convos.length === 0) {
      setCount(0);
      return;
    }

    let unread = 0;

    // Check EVENDLE welcome chat
    const welcomeRead = localStorage.getItem("dm_last_read_evendle-welcome");
    if (!welcomeRead) unread++;

    for (const convo of convos) {
      const lastRead = localStorage.getItem(`dm_last_read_${convo.id}`) || "1970-01-01T00:00:00Z";

      const { count: msgCount } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convo.id)
        .neq("sender_id", user.id)
        .gt("created_at", lastRead);

      if (msgCount && msgCount > 0) unread++;
    }

    setCount(unread);
  };

  useEffect(() => {
    computeCount();

    // Listen for new DMs via realtime
    if (!user) return;

    const channel = supabase
      .channel("dm-unread-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          // Only recompute if message is not from current user
          if ((payload.new as any).sender_id !== user.id) {
            computeCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { unreadCount: count, refreshUnread: computeCount };
}

/**
 * Mark a conversation as read (call when user opens the chat).
 */
export function markConversationRead(conversationId: string) {
  localStorage.setItem(`dm_last_read_${conversationId}`, new Date().toISOString());
}
