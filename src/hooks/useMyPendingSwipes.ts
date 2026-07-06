import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingSwipe {
  swipe_id: string;
  blitz_request_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  activity: string;
  host_id: string;
  host_name: string | null;
  host_avatar: string | null;
  expires_at: string;
}

export function useMyPendingSwipes() {
  const { user } = useAuth();
  const [items, setItems] = useState<PendingSwipe[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data: swipes } = await supabase
      .from("blitz_swipes")
      .select("id, blitz_request_id, status, created_at")
      .eq("swiper_id", user.id)
      .eq("direction", "right")
      .in("status", ["pending"])
      .order("created_at", { ascending: false });

    const list = swipes ?? [];
    if (list.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const reqIds = Array.from(new Set(list.map((s) => s.blitz_request_id)));
    const { data: reqs } = await supabase
      .from("blitz_requests")
      .select("id, activity, host_id, expires_at, status")
      .in("id", reqIds);

    const validReqs = (reqs ?? []).filter(
      (r) => r.status === "active" && new Date(r.expires_at).getTime() > Date.now()
    );
    const reqMap = new Map(validReqs.map((r) => [r.id, r]));

    const hostIds = Array.from(new Set(validReqs.map((r) => r.host_id)));
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", hostIds);
    const profMap = new Map((profs ?? []).map((p) => [p.user_id, p]));

    setItems(
      list
        .filter((s) => reqMap.has(s.blitz_request_id))
        .map((s) => {
          const r = reqMap.get(s.blitz_request_id)!;
          return {
            swipe_id: s.id,
            blitz_request_id: s.blitz_request_id,
            status: s.status as PendingSwipe["status"],
            created_at: s.created_at,
            activity: r.activity,
            host_id: r.host_id,
            host_name: profMap.get(r.host_id)?.name ?? null,
            host_avatar: profMap.get(r.host_id)?.avatar_url ?? null,
            expires_at: r.expires_at,
          };
        })
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`my-swipes-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_swipes", filter: `swiper_id=eq.${user.id}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_match_participants", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, user]);

  return { items, loading, reload: load };
}

export async function withdrawSwipe(swipeId: string) {
  const { error } = await supabase
    .from("blitz_swipes")
    .delete()
    .eq("id", swipeId);
  if (error) throw error;
}
