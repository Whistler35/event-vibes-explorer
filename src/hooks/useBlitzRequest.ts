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
}

export function useActiveBlitzRequest() {
  const { user } = useAuth();
  const [request, setRequest] = useState<BlitzRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setRequest(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("blitz_requests")
      .select("*")
      .eq("host_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRequest((data as BlitzRequest) ?? null);
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

  return { request, loading, reload: load };
}

export async function createBlitzRequest(params: {
  activity: string;
  durationMinutes: number;
  city?: string | null;
  latitude: number;
  longitude: number;
  radiusKm: number;
  audience?: BlitzAudience;
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
