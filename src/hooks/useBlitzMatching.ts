import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface IncomingBlitzRequest {
  swipe_id: string;
  blitz_request_id: string;
  swiper_id: string;
  swiper_name: string | null;
  swiper_avatar: string | null;
  swiper_bio: string | null;
  activity: string;
  created_at: string;
}

export function useIncomingBlitzRequests(blitzRequestId?: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<IncomingBlitzRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !blitzRequestId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: swipes } = await supabase
      .from("blitz_swipes")
      .select("id, blitz_request_id, swiper_id, created_at, status, direction")
      .eq("blitz_request_id", blitzRequestId)
      .eq("direction", "right")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const list = swipes ?? [];
    if (list.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data: req } = await supabase
      .from("blitz_requests")
      .select("activity")
      .eq("id", blitzRequestId)
      .maybeSingle();

    const swiperIds = Array.from(new Set(list.map((s) => s.swiper_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url, bio")
      .in("user_id", swiperIds);
    const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    setItems(
      list.map((s) => ({
        swipe_id: s.id,
        blitz_request_id: s.blitz_request_id,
        swiper_id: s.swiper_id,
        swiper_name: byUser.get(s.swiper_id)?.name ?? null,
        swiper_avatar: byUser.get(s.swiper_id)?.avatar_url ?? null,
        swiper_bio: byUser.get(s.swiper_id)?.bio ?? null,
        activity: req?.activity ?? "",
        created_at: s.created_at,
      }))
    );
    setLoading(false);
  }, [user, blitzRequestId]);

  useEffect(() => {
    load();
    if (!blitzRequestId) return;
    const channel = supabase
      .channel(`blitz-incoming-${blitzRequestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_swipes", filter: `blitz_request_id=eq.${blitzRequestId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, blitzRequestId]);

  return { items, loading, reload: load };
}

export async function acceptBlitzRequest(swipe: IncomingBlitzRequest) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error: swErr } = await supabase
    .from("blitz_swipes")
    .update({ status: "accepted" })
    .eq("id", swipe.swipe_id);
  if (swErr) throw swErr;

  const chatExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data: match, error: mErr } = await supabase
    .from("blitz_matches")
    .insert({
      blitz_request_id: swipe.blitz_request_id,
      host_id: user.id,
      participant_id: swipe.swiper_id,
      chat_expires_at: chatExpiresAt,
    })
    .select()
    .single();
  if (mErr) throw mErr;
  return match;
}

export async function rejectBlitzRequest(swipeId: string) {
  const { error } = await supabase
    .from("blitz_swipes")
    .update({ status: "rejected" })
    .eq("id", swipeId);
  if (error) throw error;
}

export interface BlitzMatch {
  id: string;
  blitz_request_id: string;
  host_id: string;
  participant_id: string;
  status: "active" | "expired" | "closed";
  chat_expires_at: string;
  created_at: string;
  activity: string | null;
  other_name: string | null;
  other_avatar: string | null;
}

export function useMyBlitzMatches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<BlitzMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setMatches([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("blitz_matches")
      .select("*")
      .or(`host_id.eq.${user.id},participant_id.eq.${user.id}`)
      .eq("status", "active")
      .gt("chat_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    const list = data ?? [];
    if (list.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const reqIds = Array.from(new Set(list.map((m) => m.blitz_request_id)));
    const otherIds = Array.from(
      new Set(list.map((m) => (m.host_id === user.id ? m.participant_id : m.host_id)))
    );

    const [{ data: reqs }, { data: profs }] = await Promise.all([
      supabase.from("blitz_requests").select("id, activity").in("id", reqIds),
      supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", otherIds),
    ]);
    const reqMap = new Map((reqs ?? []).map((r) => [r.id, r]));
    const profMap = new Map((profs ?? []).map((p) => [p.user_id, p]));

    setMatches(
      list.map((m) => {
        const otherId = m.host_id === user.id ? m.participant_id : m.host_id;
        return {
          ...(m as any),
          activity: reqMap.get(m.blitz_request_id)?.activity ?? null,
          other_name: profMap.get(otherId)?.name ?? null,
          other_avatar: profMap.get(otherId)?.avatar_url ?? null,
        };
      })
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel("blitz-matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_matches" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, user]);

  return { matches, loading, reload: load };
}
