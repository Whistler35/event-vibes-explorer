import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { unblockUser } from "@/lib/moderation";
import { toast } from "sonner";
import { ShieldOff } from "lucide-react";

interface BlockedProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

/**
 * Blocking someone can otherwise be a dead end: FriendSearch doesn't filter
 * blocked users out, so unblocking via their profile's "…" menu is
 * technically reachable — but only if you remember their name and go look.
 * A direct list here is the actual fix.
 */
const BlockedUsersList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: blocked = [] } = useQuery({
    queryKey: ["blocked-users", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user!.id);
      const ids = (rows ?? []).map((r: any) => r.blocked_id);
      if (ids.length === 0) return [] as BlockedProfile[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      return (profiles ?? []) as BlockedProfile[];
    },
  });

  const handleUnblock = async (p: BlockedProfile) => {
    try {
      await unblockUser(p.user_id);
      toast.success(`${p.name} entblockt`);
      queryClient.invalidateQueries({ queryKey: ["blocked-users", user?.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Entblocken fehlgeschlagen");
    }
  };

  if (blocked.length === 0) return null;

  const avatar = (p: BlockedProfile) =>
    p.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=C8F14F&color=1E3323&size=80`;

  return (
    <div className="border-t border-white/15 pt-6 mt-2">
      <h3 className="text-white font-bold text-lg mb-1">Blockierte Nutzer</h3>
      <p className="text-sm text-white/60 mb-3">
        Diese Personen kannst du hier jederzeit wieder entblocken.
      </p>
      <div className="space-y-2">
        {blocked.map((p) => (
          <div key={p.user_id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
            <img
              src={avatar(p)}
              alt=""
              loading="lazy"
              className="w-10 h-10 rounded-full object-cover"
            />
            <p className="flex-1 min-w-0 truncate text-white font-medium text-sm">{p.name}</p>
            <button
              onClick={() => handleUnblock(p)}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-3 py-2 transition"
            >
              <ShieldOff className="w-3.5 h-3.5" /> Entblocken
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlockedUsersList;
