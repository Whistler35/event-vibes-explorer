import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Counts pending incoming Blitz match requests (right-swipes from other users)
 * targeting the current user's currently active blitz request.
 */
export function useIncomingBlitzCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setCount(0);
      setActiveRequestId(null);
      return;
    }

    const { data: req } = await supabase
      .from("blitz_requests")
      .select("id")
      .eq("host_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!req) {
      setActiveRequestId(null);
      setCount(0);
      return;
    }

    setActiveRequestId(req.id);

    const { count: c } = await supabase
      .from("blitz_swipes")
      .select("id", { count: "exact", head: true })
      .eq("blitz_request_id", req.id)
      .eq("direction", "right")
      .eq("status", "pending");

    setCount(c ?? 0);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`blitz-incoming-count-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_swipes" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_requests", filter: `host_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, user]);

  return { count, activeRequestId };
}
