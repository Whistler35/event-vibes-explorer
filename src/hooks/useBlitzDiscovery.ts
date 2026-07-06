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
  radius_km: number;
  expires_at: string;
  created_at: string;
  audience: "public" | "friends" | "selected";
  host_name: string | null;
  host_avatar: string | null;
  distance_km: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function useBlitzDiscovery(_city?: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<DiscoveryBlitz[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerCoords, setViewerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  // Get viewer location once
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocError("Location is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setViewerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? "Location access required to see Blitzes near you."
            : "Could not determine your location."
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60_000 }
    );
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!viewerCoords) {
      // wait for location
      return;
    }
    setLoading(true);

    const { data: swipes } = await supabase
      .from("blitz_swipes")
      .select("blitz_request_id")
      .eq("swiper_id", user.id);
    const swipedIds = new Set((swipes ?? []).map((s) => s.blitz_request_id));

    const { data: requests } = await supabase
      .from("blitz_requests")
      .select(
        "id, host_id, activity, duration_minutes, city, latitude, longitude, radius_km, expires_at, created_at, audience"
      )
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .neq("host_id", user.id)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    const withDistance = (requests ?? [])
      .filter((r) => !swipedIds.has(r.id) && r.latitude != null && r.longitude != null)
      .map((r) => ({
        ...r,
        distance_km: haversineKm(viewerCoords.lat, viewerCoords.lng, r.latitude!, r.longitude!),
      }))
      .filter((r) => r.distance_km <= (r.radius_km ?? 10))
      .sort((a, b) => a.distance_km - b.distance_km);

    if (withDistance.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const hostIds = Array.from(new Set(withDistance.map((r) => r.host_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", hostIds);
    const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    setItems(
      withDistance.map((r) => ({
        ...r,
        host_name: byUser.get(r.host_id)?.name ?? null,
        host_avatar: byUser.get(r.host_id)?.avatar_url ?? null,
      }))
    );
    setLoading(false);
  }, [user, viewerCoords]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, reload: load, locError, hasLocation: !!viewerCoords };
}

export async function swipeBlitz(
  blitzRequestId: string,
  direction: "left" | "right"
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("blitz_swipes")
    .insert({
      blitz_request_id: blitzRequestId,
      swiper_id: user.id,
      direction,
    })
    .select("id")
    .single();
  if (error && !error.message.includes("duplicate")) throw error;
  return data?.id ?? null;
}

export async function undoSwipe(swipeId: string) {
  const { error } = await supabase.from("blitz_swipes").delete().eq("id", swipeId);
  if (error) throw error;
}
