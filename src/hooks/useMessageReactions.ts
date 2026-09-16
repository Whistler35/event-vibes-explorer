import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

const HEART = "❤️";

/**
 * Double-tap-to-heart reactions, shared between DM and Huddle chat — the two
 * message tables are separate, so this takes the reaction table + its scope
 * column (conversation_id / match_id) as parameters instead of hardcoding one.
 */
export function useMessageReactions(
  table: "direct_message_reactions" | "blitz_chat_message_reactions",
  scopeColumn: "conversation_id" | "match_id",
  scopeId: string | undefined,
  userId: string | undefined
) {
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});

  useEffect(() => {
    if (!scopeId) return;
    let cancelled = false;

    (async () => {
      const { data } = await (supabase.from(table as any) as any)
        .select("*")
        .eq(scopeColumn, scopeId);
      if (cancelled) return;
      const map: Record<string, MessageReaction[]> = {};
      (data ?? []).forEach((r: MessageReaction) => {
        (map[r.message_id] ??= []).push(r);
      });
      setReactions(map);
    })();

    const channel = supabase
      .channel(`${table}-${scopeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `${scopeColumn}=eq.${scopeId}` },
        (payload) => {
          const row = payload.new as MessageReaction;
          setReactions((prev) => {
            const list = prev[row.message_id] ?? [];
            if (list.some((r) => r.id === row.id)) return prev;
            return { ...prev, [row.message_id]: [...list, row] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table, filter: `${scopeColumn}=eq.${scopeId}` },
        (payload) => {
          const row = payload.old as MessageReaction;
          setReactions((prev) => {
            const list = prev[row.message_id];
            if (!list) return prev;
            return { ...prev, [row.message_id]: list.filter((r) => r.id !== row.id) };
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table, scopeColumn, scopeId]);

  const toggleHeart = useCallback(
    async (messageId: string) => {
      if (!userId || !scopeId) return;
      const mine = (reactions[messageId] ?? []).find((r) => r.user_id === userId && r.emoji === HEART);

      if (mine) {
        setReactions((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] ?? []).filter((r) => r.id !== mine.id),
        }));
        await (supabase.from(table as any) as any).delete().eq("id", mine.id);
        return;
      }

      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: MessageReaction = { id: tempId, message_id: messageId, user_id: userId, emoji: HEART };
      setReactions((prev) => ({ ...prev, [messageId]: [...(prev[messageId] ?? []), optimistic] }));

      const { data, error } = await (supabase.from(table as any) as any)
        .insert({ message_id: messageId, user_id: userId, emoji: HEART, [scopeColumn]: scopeId })
        .select()
        .single();

      if (error) {
        setReactions((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] ?? []).filter((r) => r.id !== tempId),
        }));
        return;
      }
      setReactions((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] ?? []).map((r) => (r.id === tempId ? (data as MessageReaction) : r)),
      }));
    },
    [reactions, scopeId, scopeColumn, table, userId]
  );

  return { reactions, toggleHeart };
}
