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

/**
 * Host accepts a swiper for their blitz.
 * Ensures ONE match exists per blitz_request, host is a participant,
 * and adds the swiper as a participant → group chat.
 */
export async function acceptBlitzRequest(swipe: IncomingBlitzRequest) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1) Mark the swipe as accepted
  const { error: swErr } = await supabase
    .from("blitz_swipes")
    .update({ status: "accepted" })
    .eq("id", swipe.swipe_id);
  if (swErr) throw swErr;

  // 2) Find-or-create the group match for this blitz_request
  const { data: existing } = await supabase
    .from("blitz_matches")
    .select("*")
    .eq("blitz_request_id", swipe.blitz_request_id)
    .maybeSingle();

  let match = existing;
  if (!match) {
    // Chat stays open exactly as long as the Blitz itself (falls back to 1h
    // if the Blitz somehow has no expiry).
    const { data: blitzReq } = await supabase
      .from("blitz_requests")
      .select("expires_at")
      .eq("id", swipe.blitz_request_id)
      .maybeSingle();
    const chatExpiresAt =
      blitzReq?.expires_at ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { data: inserted, error: mErr } = await supabase
      .from("blitz_matches")
      .insert({
        blitz_request_id: swipe.blitz_request_id,
        host_id: user.id,
        chat_expires_at: chatExpiresAt,
      })
      .select()
      .single();
    if (mErr) throw mErr;
    match = inserted;

    // Add host as first participant
    await supabase.from("blitz_match_participants").insert({
      match_id: match.id,
      user_id: user.id,
    });
  }

  // 3) Add the swiper as participant (idempotent via UNIQUE)
  const { error: pErr } = await supabase
    .from("blitz_match_participants")
    .insert({ match_id: match.id, user_id: swipe.swiper_id });
  if (pErr && !pErr.message.toLowerCase().includes("duplicate")) throw pErr;

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
  status: "active" | "expired" | "closed";
  chat_expires_at: string;
  created_at: string;
  activity: string | null;
  participant_count: number;
  preview_names: string[];
  preview_avatars: (string | null)[];
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

    // Find matches where I am a participant
    const { data: myParts } = await supabase
      .from("blitz_match_participants")
      .select("match_id")
      .eq("user_id", user.id);
    const matchIds = Array.from(new Set((myParts ?? []).map((p: any) => p.match_id)));

    if (matchIds.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("blitz_matches")
      .select("*")
      .in("id", matchIds)
      .eq("status", "active")
      .gt("chat_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    const list = rows ?? [];
    if (list.length === 0) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const reqIds = Array.from(new Set(list.map((m: any) => m.blitz_request_id)));
    const activeMatchIds = list.map((m: any) => m.id);

    const [{ data: reqs }, { data: allParts }] = await Promise.all([
      supabase.from("blitz_requests").select("id, activity").in("id", reqIds),
      supabase
        .from("blitz_match_participants")
        .select("match_id, user_id")
        .in("match_id", activeMatchIds),
    ]);
    const reqMap = new Map((reqs ?? []).map((r: any) => [r.id, r]));

    const otherUserIds = Array.from(
      new Set((allParts ?? []).map((p: any) => p.user_id).filter((id: string) => id !== user.id))
    );
    const { data: profs } = otherUserIds.length
      ? await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", otherUserIds)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));

    setMatches(
      list.map((m: any) => {
        const partsForMatch = (allParts ?? []).filter((p: any) => p.match_id === m.id);
        const others = partsForMatch
          .map((p: any) => p.user_id)
          .filter((id: string) => id !== user.id);
        return {
          id: m.id,
          blitz_request_id: m.blitz_request_id,
          host_id: m.host_id,
          status: m.status,
          chat_expires_at: m.chat_expires_at,
          created_at: m.created_at,
          activity: reqMap.get(m.blitz_request_id)?.activity ?? null,
          participant_count: partsForMatch.length,
          preview_names: others.slice(0, 3).map((id: string) => profMap.get(id)?.name ?? "?"),
          preview_avatars: others.slice(0, 3).map((id: string) => profMap.get(id)?.avatar_url ?? null),
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_match_participants" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, user]);

  return { matches, loading, reload: load };
}
