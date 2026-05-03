import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

export type StatKind =
  | "users"
  | "events"
  | "participations"
  | "likes"
  | "messages"
  | "friendships"
  | "joinRequests"
  | "rejectedEvents";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: StatKind | null;
  threshold: string | null;
}

const TITLES: Record<StatKind, string> = {
  users: "Users",
  events: "Events",
  participations: "Participations",
  likes: "Likes",
  messages: "Messages",
  friendships: "Friendships",
  joinRequests: "Join Requests",
  rejectedEvents: "Rejected Events",
};

interface Row {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  avatar?: string | null;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

const StatDetailSheet = ({ open, onOpenChange, kind, threshold }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !kind) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, threshold]);

  const withThreshold = (q: any, col = "created_at") =>
    threshold ? q.gte(col, threshold) : q;

  const load = async () => {
    if (!kind) return;
    setLoading(true);
    setRows([]);
    try {
      if (kind === "users") {
        const { data } = await withThreshold(
          supabase.from("profiles").select("id,name,avatar_url,age,country,created_at").order("created_at", { ascending: false }).limit(200)
        );
        setRows((data ?? []).map((p: any) => ({
          id: p.id,
          title: p.name || "Unnamed",
          subtitle: [p.age && `${p.age} J.`, p.country].filter(Boolean).join(" · "),
          meta: fmt(p.created_at),
          avatar: p.avatar_url,
        })));
      } else if (kind === "events" || kind === "rejectedEvents") {
        let q = supabase.from("events").select("id,title,location_name,event_date,image_url,approval_status,created_at").order("created_at", { ascending: false }).limit(200);
        if (kind === "rejectedEvents") q = q.eq("approval_status", "rejected");
        const { data } = await withThreshold(q);
        setRows((data ?? []).map((e: any) => ({
          id: e.id,
          title: e.title,
          subtitle: e.location_name,
          meta: `${fmt(e.event_date)} · ${e.approval_status}`,
          avatar: e.image_url,
        })));
      } else if (kind === "participations") {
        const { data } = await withThreshold(
          supabase.from("event_participants").select("id,user_id,event_id,joined_at").order("joined_at", { ascending: false }).limit(200),
          "joined_at"
        );
        const userIds = [...new Set<string>((data ?? []).map((d: any) => d.user_id))];
        const eventIds = [...new Set<string>((data ?? []).map((d: any) => d.event_id))];
        const [profilesRes, eventsRes] = await Promise.all([
          supabase.from("profiles").select("user_id,name,avatar_url").in("user_id", userIds),
          supabase.from("events").select("id,title").in("id", eventIds),
        ]);
        const pMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));
        const eMap = new Map((eventsRes.data ?? []).map((e: any) => [e.id, e]));
        setRows((data ?? []).map((d: any) => {
          const p: any = pMap.get(d.user_id);
          const e: any = eMap.get(d.event_id);
          return {
            id: d.id,
            title: p?.name || "User",
            subtitle: `→ ${e?.title || "Event"}`,
            meta: fmt(d.joined_at),
            avatar: p?.avatar_url,
          };
        }));
      } else if (kind === "likes") {
        const { data } = await withThreshold(
          supabase.from("event_likes").select("id,user_id,event_id,created_at").order("created_at", { ascending: false }).limit(200)
        );
        const userIds = [...new Set<string>((data ?? []).map((d: any) => d.user_id))];
        const eventIds = [...new Set<string>((data ?? []).map((d: any) => d.event_id))];
        const [profilesRes, eventsRes] = await Promise.all([
          supabase.from("profiles").select("user_id,name,avatar_url").in("user_id", userIds),
          supabase.from("events").select("id,title").in("id", eventIds),
        ]);
        const pMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));
        const eMap = new Map((eventsRes.data ?? []).map((e: any) => [e.id, e]));
        setRows((data ?? []).map((d: any) => {
          const p: any = pMap.get(d.user_id);
          const e: any = eMap.get(d.event_id);
          return {
            id: d.id,
            title: p?.name || "User",
            subtitle: `❤ ${e?.title || "Event"}`,
            meta: fmt(d.created_at),
            avatar: p?.avatar_url,
          };
        }));
      } else if (kind === "messages") {
        const [chatRes, dmRes] = await Promise.all([
          withThreshold(supabase.from("chat_messages").select("id,user_id,message,created_at").order("created_at", { ascending: false }).limit(100)),
          withThreshold(supabase.from("direct_messages").select("id,sender_id,message,created_at").order("created_at", { ascending: false }).limit(100)),
        ]);
        const combined = [
          ...((chatRes.data ?? []) as any[]).map((m) => ({ ...m, type: "Group", uid: m.user_id })),
          ...((dmRes.data ?? []) as any[]).map((m) => ({ ...m, type: "DM", uid: m.sender_id })),
        ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200);
        const userIds = [...new Set<string>(combined.map((m) => m.uid))];
        const { data: profiles } = await supabase.from("profiles").select("user_id,name,avatar_url").in("user_id", userIds);
        const pMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
        setRows(combined.map((m) => {
          const p: any = pMap.get(m.uid);
          return {
            id: m.id,
            title: p?.name || "User",
            subtitle: m.message?.slice(0, 80),
            meta: `${m.type} · ${fmt(m.created_at)}`,
            avatar: p?.avatar_url,
          };
        }));
      } else if (kind === "friendships") {
        const { data } = await withThreshold(
          supabase.from("friendships").select("id,requester_id,addressee_id,status,created_at").eq("status", "accepted").order("created_at", { ascending: false }).limit(200)
        );
        const userIds = [...new Set<string>((data ?? []).flatMap((d: any) => [d.requester_id, d.addressee_id]))];
        const { data: profiles } = await supabase.from("profiles").select("user_id,name,avatar_url").in("user_id", userIds);
        const pMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
        setRows((data ?? []).map((d: any) => {
          const a: any = pMap.get(d.requester_id);
          const b: any = pMap.get(d.addressee_id);
          return {
            id: d.id,
            title: `${a?.name || "?"} ↔ ${b?.name || "?"}`,
            meta: fmt(d.created_at),
            avatar: a?.avatar_url,
          };
        }));
      } else if (kind === "joinRequests") {
        const { data } = await withThreshold(
          supabase.from("join_requests").select("id,user_id,event_id,status,message,created_at").order("created_at", { ascending: false }).limit(200)
        );
        const userIds = [...new Set<string>((data ?? []).map((d: any) => d.user_id))];
        const eventIds = [...new Set<string>((data ?? []).map((d: any) => d.event_id))];
        const [profilesRes, eventsRes] = await Promise.all([
          supabase.from("profiles").select("user_id,name,avatar_url").in("user_id", userIds),
          supabase.from("events").select("id,title").in("id", eventIds),
        ]);
        const pMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));
        const eMap = new Map((eventsRes.data ?? []).map((e: any) => [e.id, e]));
        setRows((data ?? []).map((d: any) => {
          const p: any = pMap.get(d.user_id);
          const e: any = eMap.get(d.event_id);
          return {
            id: d.id,
            title: p?.name || "User",
            subtitle: `→ ${e?.title || "Event"} (${d.status})`,
            meta: fmt(d.created_at),
            avatar: p?.avatar_url,
          };
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{kind ? TITLES[kind] : ""}{rows.length > 0 && ` (${rows.length})`}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">No data</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-medium text-sm truncate">{r.title}</p>
                  {r.subtitle && <p className="text-muted-foreground text-xs truncate">{r.subtitle}</p>}
                </div>
                {r.meta && <span className="text-muted-foreground text-[10px] shrink-0">{r.meta}</span>}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default StatDetailSheet;
