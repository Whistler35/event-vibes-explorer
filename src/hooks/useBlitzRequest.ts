import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BlitzAudience = "public" | "friends" | "selected";

export interface BlitzRequest {
  id: string;
  host_id: string;
  activity: string;
  duration_minutes: number;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "active" | "expired" | "cancelled" | "matched";
  created_at: string;
  expires_at: string;
  radius_km: number;
  audience: BlitzAudience;
  /** Optional picture shown on the back of the Blitz card. */
  image_url?: string | null;
  /** "Freifeld": admins can send a Blitz under another name/logo. */
  display_name?: string | null;
  display_avatar_url?: string | null;
}

export function useActiveBlitzRequest() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BlitzRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("blitz_requests")
      .select("*")
      .eq("host_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setRequests((data as BlitzRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel("blitz-own")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_requests", filter: `host_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // `request` stays the newest active Blitz (what regular users have — one at
  // a time); `requests` is the full list, which only admins can have >1 of.
  return { request: requests[0] ?? null, requests, loading, reload: load };
}

export async function createBlitzRequest(params: {
  activity: string;
  durationMinutes: number;
  city?: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number;
  audience?: BlitzAudience;
  targetUserIds?: string[];
  imageUrl?: string | null;
  /** Admin-only "Freifeld" (the DB trigger drops these for non-admins). */
  displayName?: string | null;
  displayAvatarUrl?: string | null;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const expiresAt = new Date(Date.now() + params.durationMinutes * 60_000).toISOString();

  const { data, error } = await supabase
    .from("blitz_requests")
    .insert({
      host_id: user.id,
      activity: params.activity.trim(),
      duration_minutes: params.durationMinutes,
      city: params.city ?? null,
      latitude: params.latitude,
      longitude: params.longitude,
      radius_km: params.radiusKm,
      expires_at: expiresAt,
      audience: params.audience ?? "public",
      target_user_ids:
        params.audience === "selected" && params.targetUserIds?.length
          ? params.targetUserIds
          : null,
      image_url: params.imageUrl ?? null,
      display_name: params.displayName?.trim() || null,
      display_avatar_url: params.displayName?.trim() ? params.displayAvatarUrl ?? null : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BlitzRequest;
}

export async function cancelBlitzRequest(id: string) {
  const { error } = await supabase
    .from("blitz_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}
