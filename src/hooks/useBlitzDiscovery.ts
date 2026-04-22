import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DiscoveryBlitz {
  id: string;
  host_id: string;
  activity: string;
  duration_minutes: number;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  expires_at: string;
  created_at: string;
  host_name: string | null;
  host_avatar: string | null;
}

export function useBlitzDiscovery(city?: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<DiscoveryBlitz[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: swipes } = await supabase
      .from("blitz_swipes")
      .select("blitz_request_id")
      .eq("swiper_id", user.id);
    const swipedIds = new Set((swipes ?? []).map((s) => s.blitz_request_id));

    let query = supabase
      .from("blitz_requests")
      .select("id, host_id, activity, duration_minutes, city, latitude, longitude, expires_at, created_at")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .neq("host_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (city) query = query.eq("city", city);

    const { data: requests } = await query;
    const fresh = (requests ?? []).filter((r) => !swipedIds.has(r.id));

    if (fresh.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const hostIds = Array.from(new Set(fresh.map((r) => r.host_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", hostIds);
    const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    setItems(
      fresh.map((r) => ({
        ...r,
        host_name: byUser.get(r.host_id)?.name ?? null,
        host_avatar: byUser.get(r.host_id)?.avatar_url ?? null,
      }))
    );
    setLoading(false);
  }, [user, city]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, reload: load };
}

export async function swipeBlitz(blitzRequestId: string, direction: "left" | "right") {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("blitz_swipes").insert({
    blitz_request_id: blitzRequestId,
    swiper_id: user.id,
    direction,
  });
  if (error && !error.message.includes("duplicate")) throw error;
}
