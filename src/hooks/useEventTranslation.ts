import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a translated description for an event in the current UI language.
 * Title is NEVER translated — only the description.
 * Falls back to the original description while loading or on error.
 */
export function useEventTranslation(event: { id?: string; description?: string | null } | null | undefined) {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").startsWith("de") ? "de" : "en";
  const eventId = event?.id;
  const original = event?.description || "";

  const query = useQuery({
    queryKey: ["event-translation", eventId, lang],
    enabled: !!eventId && !!original && original.trim().length > 0,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("translate-event", {
        body: { event_id: eventId, target_language: lang },
      });
      if (error) throw error;
      return (data as { description?: string })?.description || original;
    },
  });

  return {
    description: query.data || original,
    isTranslating: query.isLoading,
    isOriginal: !query.data || query.data === original,
  };
}
