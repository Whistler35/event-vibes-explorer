import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget event log so growth features (Feed, streak, ritual pushes)
 * can actually be measured. Never throws — analytics must never break the
 * app it's trying to measure.
 */
export function trackEvent(userId: string | undefined, eventType: string, data: Record<string, unknown> = {}) {
  if (!userId) return;
  supabase
    .from("analytics_events" as any)
    .insert({ user_id: userId, event_type: eventType, data })
    .then(() => {}, () => {});
}
