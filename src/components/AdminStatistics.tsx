import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, UserPlus, MessageCircle, Heart, Handshake, TrendingUp, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type TimeRange = "7d" | "30d" | "12m" | "all";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "12m": "12 Months",
  "all": "Total",
};

const getDateThreshold = (range: TimeRange): string | null => {
  if (range === "all") return null;
  const now = new Date();
  if (range === "7d") now.setDate(now.getDate() - 7);
  else if (range === "30d") now.setDate(now.getDate() - 30);
  else if (range === "12m") now.setMonth(now.getMonth() - 12);
  return now.toISOString();
};

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
  music: "Music",
  sports: "Sports",
  culture: "Culture",
  food: "Food",
  nightlife: "Nightlife",
  outdoor: "Outdoor",
  community: "Community",
  workshop: "Workshop",
  other: "Other",
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
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  useEffect(() => {
    fetchAllStats();
  }, [timeRange]);

  const fetchAllStats = async () => {
    setLoading(true);
    const threshold = getDateThreshold(timeRange);
    await Promise.all([fetchCounts(threshold), fetchMonthlyGrowth(threshold), fetchCategoryBreakdown(threshold)]);
    setLoading(false);
  };

  const addDateFilter = (query: any, threshold: string | null, column = "created_at") => {
    if (threshold) return query.gte(column, threshold);
    return query;
  };

  const fetchCounts = async (threshold: string | null) => {
    const [
      profiles, events, approvedEvents, pendingEvents, rejectedEvents,
      participants, chatMessages, directMessages, likes, friendships, joinRequests,
    ] = await Promise.all([
      addDateFilter(supabase.from("profiles").select("id", { count: "exact", head: true }), threshold),
      addDateFilter(supabase.from("events").select("id", { count: "exact", head: true }), threshold),
      addDateFilter(supabase.from("events").select("id", { count: "exact", head: true }).eq("approval_status", "approved"), threshold),
      addDateFilter(supabase.from("events").select("id", { count: "exact", head: true }).eq("approval_status", "pending"), threshold),
      addDateFilter(supabase.from("events").select("id", { count: "exact", head: true }).eq("approval_status", "rejected"), threshold),
      addDateFilter(supabase.from("event_participants").select("id", { count: "exact", head: true }), threshold, "joined_at"),
      addDateFilter(supabase.from("chat_messages").select("id", { count: "exact", head: true }), threshold),
      addDateFilter(supabase.from("direct_messages").select("id", { count: "exact", head: true }), threshold),
      addDateFilter(supabase.from("event_likes").select("id", { count: "exact", head: true }), threshold),
      addDateFilter(supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted"), threshold),
      addDateFilter(supabase.from("join_requests").select("id", { count: "exact", head: true }), threshold),
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

  const fetchMonthlyGrowth = async (threshold: string | null) => {
    let profilesQuery = supabase.from("profiles").select("created_at").order("created_at", { ascending: true });
    let eventsQuery = supabase.from("events").select("created_at").order("created_at", { ascending: true });
    if (threshold) {
      profilesQuery = profilesQuery.gte("created_at", threshold);
      eventsQuery = eventsQuery.gte("created_at", threshold);
    }
    const [profilesRes, eventsRes] = await Promise.all([profilesQuery, eventsQuery]);

    const useDaily = timeRange === "7d" || timeRange === "30d";
    const bucketMap = new Map<string, { users: number; events: number }>();

    const addToBucket = (dateStr: string, type: "users" | "events") => {
      const d = new Date(dateStr);
      const key = useDaily
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!bucketMap.has(key)) bucketMap.set(key, { users: 0, events: 0 });
      bucketMap.get(key)![type]++;
    };

    (profilesRes.data ?? []).forEach((p) => addToBucket(p.created_at, "users"));
    (eventsRes.data ?? []).forEach((e) => addToBucket(e.created_at, "events"));

    // Fill in missing days/months
    if (useDaily) {
      const days = timeRange === "7d" ? 7 : 30;
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!bucketMap.has(key)) bucketMap.set(key, { users: 0, events: 0 });
      }
    }

    const sorted = Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => {
        let label: string;
        if (useDaily) {
          const [, m, day] = key.split("-");
          label = `${day}.${m}.`;
        } else {
          const [year, month] = key.split("-");
          label = new Date(Number(year), Number(month) - 1).toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
        }
        return { month: label, users: val.users, events: val.events };
      });

    setMonthlyData(sorted);
  };

  const fetchCategoryBreakdown = async (threshold: string | null) => {
    let query = supabase.from("events").select("category").eq("approval_status", "approved");
    if (threshold) query = query.gte("created_at", threshold);
    const { data } = await query;

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

  const chartTitle = timeRange === "7d" ? "Letzte 7 Tage" : timeRange === "30d" ? "Letzte 30 Tage" : timeRange === "12m" ? "Letzte 12 Monate" : "Gesamter Zeitraum";

  const exportCSV = () => {
    if (!stats) return;
    const rows = [
      ["Metrik", "Wert"],
      ["Zeitraum", chartTitle],
      ["Nutzer", stats.totalUsers],
      ["Events gesamt", stats.totalEvents],
      ["Events genehmigt", stats.approvedEvents],
      ["Events offen", stats.pendingEvents],
      ["Events abgelehnt", stats.rejectedEvents],
      ["Teilnahmen", stats.totalParticipants],
      ["Gruppen-Nachrichten", stats.totalChatMessages],
      ["Direktnachrichten", stats.totalDirectMessages],
      ["Likes", stats.totalLikes],
      ["Freundschaften", stats.totalFriendships],
      ["Beitrittsanfragen", stats.totalJoinRequests],
      ["Ø Teilnahmen/Event", stats.approvedEvents > 0 ? (stats.totalParticipants / stats.approvedEvents).toFixed(1) : "0"],
      ["Ø Nachrichten/Nutzer", stats.totalUsers > 0 ? ((stats.totalChatMessages + stats.totalDirectMessages) / stats.totalUsers).toFixed(1) : "0"],
      [],
      ["Kategorie", "Anzahl"],
      ...categoryData.map((c) => [c.category, c.count]),
      [],
      [timeRange === "7d" || timeRange === "30d" ? "Tag" : "Monat", "Nutzer", "Events"],
      ...monthlyData.map((m) => [m.month, m.users, m.events]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evendle-statistiken-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector + Export */}
      <div className="flex gap-2 items-center">
        {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors ${
              timeRange === range
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {TIME_RANGE_LABELS[range]}
          </button>
        ))}
        <button
          onClick={exportCSV}
          disabled={loading || !stats}
          className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Als CSV exportieren"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Statistiken laden...</div>
      ) : !stats ? null : (
        <>
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

          {/* Growth Chart */}
          {monthlyData.length > 0 && (
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> {chartTitle}
              </h4>
              <div className="bg-card rounded-2xl border border-border p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={timeRange === "30d" ? 4 : 0} />
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
        </>
      )}
    </div>
  );
};

export default AdminStatistics;
