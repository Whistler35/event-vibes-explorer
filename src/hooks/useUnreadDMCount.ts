import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks unread direct messages using database-persisted read timestamps.
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

    let unread = 0;

    // Check EVENDLE welcome chat
    const welcomeRead = localStorage.getItem("dm_last_read_evendle-welcome");
    if (!welcomeRead) unread++;

    if (!convos || convos.length === 0) {
      setCount(unread);
      return;
    }

    // Get all read timestamps for this user in one query
    const convoIds = convos.map((c) => c.id);
    const { data: reads } = await supabase
      .from("conversation_reads")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id)
      .in("conversation_id", convoIds);

    const readMap = new Map<string, string>();
    if (reads) {
      for (const r of reads) {
        readMap.set(r.conversation_id, r.last_read_at);
      }
    }

    for (const convo of convos) {
      const lastRead = readMap.get(convo.id) || "1970-01-01T00:00:00Z";

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

    if (!user) return;

    const channel = supabase
      .channel("dm-unread-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
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
 * Upserts a row in conversation_reads.
 */
export async function markConversationRead(conversationId: string, userId?: string) {
  // Special case for welcome chat
  if (conversationId === "evendle-welcome") {
    localStorage.setItem("dm_last_read_evendle-welcome", new Date().toISOString());
    return;
  }

  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (!userId) return;

  const now = new Date().toISOString();

  // Try update first, then insert if no rows updated
  const { data: existing } = await supabase
    .from("conversation_reads")
    .select("id")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("conversation_reads")
      .update({ last_read_at: now } as any)
      .eq("id", existing.id);
  } else {
    await supabase
      .from("conversation_reads")
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        last_read_at: now,
      } as any);
  }
}
