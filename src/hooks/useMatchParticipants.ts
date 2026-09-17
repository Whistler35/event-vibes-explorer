import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParticipantProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

/** Everyone who was at a given Blitz (host + all joined participants) — used
 * for @-mention autocomplete and "tag people in this photo". */
export function useMatchParticipants(matchId: string | undefined) {
  return useQuery({
    queryKey: ["match-participants", matchId],
    enabled: !!matchId,
    queryFn: async () => {
      if (!matchId) return [] as ParticipantProfile[];
      const [{ data: match }, { data: parts }] = await Promise.all([
        supabase.from("blitz_matches").select("host_id").eq("id", matchId).maybeSingle(),
        supabase.from("blitz_match_participants").select("user_id").eq("match_id", matchId),
      ]);
      const ids = Array.from(
        new Set([...(parts ?? []).map((p: any) => p.user_id), match?.host_id].filter(Boolean))
      );
      if (ids.length === 0) return [] as ParticipantProfile[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      return (profiles ?? []) as ParticipantProfile[];
    },
  });
}
