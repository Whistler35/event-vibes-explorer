import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks unread direct messages using database-persisted read timestamps.
 * Hidden (deleted-from-list) conversations don't count unless a new message
 * has arrived since they were hidden.
 */
export function useUnreadDMCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const computeCount = async () => {
    if (!user) {
      setCount(0);
      return;
    }

    const { data: convos } = await supabase
      .from("direct_conversations")
      .select("id, updated_at")
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

    let unread = 0;

    if (!convos || convos.length === 0) {
      setCount(unread);
      return;
    }

    const convoIds = convos.map((c) => c.id);
    const { data: reads } = await supabase
      .from("conversation_reads")
      .select("conversation_id, last_read_at, hidden_at")
      .eq("user_id", user.id)
      .in("conversation_id", convoIds);

    const readMap = new Map<string, { last_read_at: string; hidden_at: string | null }>();
    if (reads) {
      for (const r of reads) {
        readMap.set(r.conversation_id, { last_read_at: r.last_read_at, hidden_at: (r as any).hidden_at ?? null });
      }
    }

    for (const convo of convos) {
      const read = readMap.get(convo.id);
      const lastRead = read?.last_read_at || "1970-01-01T00:00:00Z";
      const hiddenAt = read?.hidden_at;
      // Hidden and nothing new since → doesn't count.
      if (hiddenAt && new Date(convo.updated_at) <= new Date(hiddenAt)) continue;

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

async function upsertConversationRead(
  conversationId: string,
  userId: string,
  fields: { last_read_at?: string; hidden_at?: string | null }
) {
  const { data: existing } = await supabase
    .from("conversation_reads")
    .select("id")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (existing) {
    await supabase.from("conversation_reads").update(fields as any).eq("id", existing.id);
  } else {
    await supabase.from("conversation_reads").insert({
      user_id: userId,
      conversation_id: conversationId,
      last_read_at: fields.last_read_at ?? new Date().toISOString(),
      hidden_at: fields.hidden_at ?? null,
    } as any);
  }
}

/** Mark a conversation as read (call when user opens the chat). */
export async function markConversationRead(conversationId: string, userId?: string) {
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }
  if (!userId) return;
  await upsertConversationRead(conversationId, userId, { last_read_at: new Date().toISOString() });
}

/** Mark a conversation as unread again (manual action from the chat list). */
export async function markConversationUnread(conversationId: string, userId: string) {
  await upsertConversationRead(conversationId, userId, { last_read_at: new Date(0).toISOString() });
}

/**
 * "Delete" a conversation from the list — hides it for this user only (the
 * other participant keeps their copy, same as WhatsApp/iMessage). It
 * reappears automatically the moment a new message arrives.
 */
export async function hideConversation(conversationId: string, userId: string) {
  await upsertConversationRead(conversationId, userId, { hidden_at: new Date().toISOString() });
}
