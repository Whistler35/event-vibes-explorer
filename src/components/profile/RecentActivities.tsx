import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin } from "lucide-react";

interface ActivityEvent {
  id: string;
  title: string;
  event_date: string;
  location_name: string;
  image_url: string | null;
}

const RecentActivities = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: parts } = await supabase
        .from("event_participants")
        .select("event_id, joined_at")
        .eq("user_id", userId)
        .order("joined_at", { ascending: false })
        .limit(6);
      let ids = (parts || []).map((p) => p.event_id);

      const { data: hosted } = await supabase
        .from("events")
        .select("id, title, event_date, location_name, image_url, created_at")
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .limit(6);

      const fromHosted = (hosted as ActivityEvent[]) || [];
      let fromJoined: ActivityEvent[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("events")
          .select("id, title, event_date, location_name, image_url")
          .in("id", ids);
        fromJoined = (data as ActivityEvent[]) || [];
      }
      const merged = [...fromHosted, ...fromJoined]
        .reduce<ActivityEvent[]>((acc, e) => (acc.some((x) => x.id === e.id) ? acc : [...acc, e]), [])
        .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
        .slice(0, 6);
      setItems(merged);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (!loading && items.length === 0) return null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });

  return (
    <div className="space-y-3">
      <h3 className="text-white font-bold text-lg px-4">{t('recentActivities.title')}</h3>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
        {items.map((e) => (
          <button
            key={e.id}
            onClick={() => navigate(`/event/${e.id}`)}
            className="shrink-0 w-56 rounded-2xl overflow-hidden bg-white/5 border border-white/10 text-left hover:bg-white/10 transition"
          >
            <div className="h-24 bg-white/10 overflow-hidden">
              {e.image_url ? (
                <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-white/40" />
                </div>
              )}
            </div>
            <div className="p-3 space-y-1">
              <p className="text-white font-bold text-sm truncate">{e.title}</p>
              <div className="flex items-center gap-1 text-white/60 text-xs">
                <Calendar className="w-3 h-3" /> {formatDate(e.event_date)}
              </div>
              <div className="flex items-center gap-1 text-white/60 text-xs truncate">
                <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{e.location_name}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentActivities;
