import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, UserPlus, MessageCircle, Heart, Handshake, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Stats {
  totalUsers: number;
  totalEvents: number;
  approvedEvents: number;
  pendingEvents: number;
  rejectedEvents: number;
  totalParticipants: number;
  totalChatMessages: number;
  totalDirectMessages: number;
  totalLikes: number;
  totalFriendships: number;
  totalJoinRequests: number;
}

interface MonthlyData {
  month: string;
  users: number;
  events: number;
}

interface CategoryData {
  category: string;
  count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  music: "Musik",
  sports: "Sport",
  culture: "Kultur",
  food: "Essen",
  nightlife: "Nightlife",
  outdoor: "Outdoor",
  community: "Community",
  workshop: "Workshop",
  other: "Sonstiges",
};

const StatCard = ({ icon: Icon, label, value, subtext }: { icon: any; label: string; value: number | string; subtext?: string }) => (
  <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{label}</span>
    </div>
    <p className="text-foreground text-2xl font-bold">{value}</p>
    {subtext && <p className="text-muted-foreground text-xs">{subtext}</p>}
  </div>
);

const AdminStatistics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    setLoading(true);
    await Promise.all([fetchCounts(), fetchMonthlyGrowth(), fetchCategoryBreakdown()]);
    setLoading(false);
  };

  const fetchCounts = async () => {
    const [
      profiles,
      events,
      approvedEvents,
      pendingEvents,
      rejectedEvents,
      participants,
      chatMessages,
      directMessages,
      likes,
      friendships,
      joinRequests,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("approval_status", "approved"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("approval_status", "rejected"),
      supabase.from("event_participants").select("id", { count: "exact", head: true }),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }),
      supabase.from("direct_messages").select("id", { count: "exact", head: true }),
      supabase.from("event_likes").select("id", { count: "exact", head: true }),
      supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted"),
      supabase.from("join_requests").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      totalUsers: profiles.count ?? 0,
      totalEvents: events.count ?? 0,
      approvedEvents: approvedEvents.count ?? 0,
      pendingEvents: pendingEvents.count ?? 0,
      rejectedEvents: rejectedEvents.count ?? 0,
      totalParticipants: participants.count ?? 0,
      totalChatMessages: chatMessages.count ?? 0,
      totalDirectMessages: directMessages.count ?? 0,
      totalLikes: likes.count ?? 0,
      totalFriendships: friendships.count ?? 0,
      totalJoinRequests: joinRequests.count ?? 0,
    });
  };

  const fetchMonthlyGrowth = async () => {
    const [profilesRes, eventsRes] = await Promise.all([
      supabase.from("profiles").select("created_at").order("created_at", { ascending: true }),
      supabase.from("events").select("created_at").order("created_at", { ascending: true }),
    ]);

    const monthMap = new Map<string, { users: number; events: number }>();

    const addToMonth = (dateStr: string, type: "users" | "events") => {
      const d = new Date(dateStr);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) monthMap.set(key, { users: 0, events: 0 });
      monthMap.get(key)![type]++;
    };

    (profilesRes.data ?? []).forEach((p) => addToMonth(p.created_at, "users"));
    (eventsRes.data ?? []).forEach((e) => addToMonth(e.created_at, "events"));

    const sorted = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, val]) => {
        const [year, month] = key.split("-");
        const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
        return { month: label, users: val.users, events: val.events };
      });

    setMonthlyData(sorted);
  };

  const fetchCategoryBreakdown = async () => {
    const { data } = await supabase
      .from("events")
      .select("category")
      .eq("approval_status", "approved");

    if (!data) return;

    const counts = new Map<string, number>();
    data.forEach((e) => {
      const cat = e.category || "other";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });

    const sorted = Array.from(counts.entries())
      .map(([category, count]) => ({ category: CATEGORY_LABELS[category] || category, count }))
      .sort((a, b) => b.count - a.count);

    setCategoryData(sorted);
  };

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Statistiken laden...</div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div>
        <h4 className="text-foreground font-semibold text-sm mb-3">Übersicht</h4>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Nutzer" value={stats.totalUsers} />
          <StatCard icon={CalendarDays} label="Events gesamt" value={stats.totalEvents} subtext={`${stats.approvedEvents} genehmigt · ${stats.pendingEvents} offen`} />
          <StatCard icon={UserPlus} label="Teilnahmen" value={stats.totalParticipants} />
          <StatCard icon={Heart} label="Likes" value={stats.totalLikes} />
          <StatCard icon={MessageCircle} label="Nachrichten" value={stats.totalChatMessages + stats.totalDirectMessages} subtext={`${stats.totalChatMessages} Gruppen · ${stats.totalDirectMessages} DMs`} />
          <StatCard icon={Handshake} label="Freundschaften" value={stats.totalFriendships} />
        </div>
      </div>

      {/* Monthly Growth Chart */}
      {monthlyData.length > 0 && (
        <div>
          <h4 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Wachstum (letzte 12 Monate)
          </h4>
          <div className="bg-card rounded-2xl border border-border p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="users" name="Nutzer" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="events" name="Events" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <div>
          <h4 className="text-foreground font-semibold text-sm mb-3">Events nach Kategorie</h4>
          <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
            {categoryData.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <span className="text-foreground text-sm">{cat.category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(cat.count / Math.max(...categoryData.map((c) => c.count))) * 100}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-xs font-mono w-6 text-right">{cat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Details */}
      <div>
        <h4 className="text-foreground font-semibold text-sm mb-3">Weitere Details</h4>
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          <div className="flex justify-between p-3">
            <span className="text-muted-foreground text-sm">Beitrittsanfragen</span>
            <span className="text-foreground text-sm font-semibold">{stats.totalJoinRequests}</span>
          </div>
          <div className="flex justify-between p-3">
            <span className="text-muted-foreground text-sm">Abgelehnte Events</span>
            <span className="text-foreground text-sm font-semibold">{stats.rejectedEvents}</span>
          </div>
          <div className="flex justify-between p-3">
            <span className="text-muted-foreground text-sm">Ø Teilnahmen pro Event</span>
            <span className="text-foreground text-sm font-semibold">
              {stats.approvedEvents > 0 ? (stats.totalParticipants / stats.approvedEvents).toFixed(1) : "0"}
            </span>
          </div>
          <div className="flex justify-between p-3">
            <span className="text-muted-foreground text-sm">Ø Nachrichten pro Nutzer</span>
            <span className="text-foreground text-sm font-semibold">
              {stats.totalUsers > 0 ? ((stats.totalChatMessages + stats.totalDirectMessages) / stats.totalUsers).toFixed(1) : "0"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStatistics;
