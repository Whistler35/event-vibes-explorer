import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Camera, Zap } from "lucide-react";

interface GridPost {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  activity: string | null;
}

interface Props {
  userId: string;
  title?: string;
}

/**
 * BeReal-style grid of a user's Blitz Feed photos, shown on their profile —
 * used for both the signed-in user's own profile and anyone else's. RLS on
 * blitz_feed_posts already scopes the query to what the *viewer* is allowed
 * to see (their own, friends', or public posts), so no extra visibility
 * filtering is needed here regardless of whose profile this is.
 */
const BlitzMomentsGrid = ({ userId, title = "Blitz-Momente" }: Props) => {
  const [preview, setPreview] = useState<GridPost | null>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["blitz-moments-grid", userId],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("blitz_feed_posts" as any)
        .select("id, photo_url, caption, created_at, match_id")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });
      const list = (rows ?? []) as any[];
      if (list.length === 0) return [] as GridPost[];

      const matchIds = Array.from(new Set(list.map((p) => p.match_id)));
      const { data: matches } = await supabase
        .from("blitz_matches")
        .select("id, blitz_request_id")
        .in("id", matchIds);
      const requestIds = Array.from(new Set((matches ?? []).map((m: any) => m.blitz_request_id)));
      const { data: requests } = requestIds.length
        ? await supabase.from("blitz_requests").select("id, activity").in("id", requestIds)
        : { data: [] as any[] };
      const activityByMatch = new Map(
        (matches ?? []).map((m: any) => [m.id, requests?.find((r: any) => r.id === m.blitz_request_id)?.activity ?? null])
      );

      return list.map((p) => ({
        id: p.id,
        photo_url: p.photo_url,
        caption: p.caption,
        created_at: p.created_at,
        activity: activityByMatch.get(p.match_id) ?? null,
      })) as GridPost[];
    },
  });

  if (posts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-muted-foreground font-black text-[11px] uppercase tracking-[0.25em]">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {posts.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreview(p)}
            className="aspect-square rounded-xl overflow-hidden bg-muted"
          >
            <img src={p.photo_url} alt="" loading="lazy" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4 gap-4"
        >
          <img src={preview.photo_url} alt="" className="max-w-full max-h-[70vh] rounded-2xl object-contain" />
          <div className="text-center px-4">
            {preview.activity && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(var(--bolt))]/20 text-[hsl(var(--bolt))] text-xs font-black uppercase tracking-wide mb-2">
                <Zap className="w-3 h-3 fill-current" /> {preview.activity}
              </span>
            )}
            {preview.caption && <p className="text-white text-sm mb-1">{preview.caption}</p>}
            <p className="text-white/50 text-xs">
              {formatDistanceToNow(new Date(preview.created_at), { addSuffix: true, locale: de })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlitzMomentsGrid;
