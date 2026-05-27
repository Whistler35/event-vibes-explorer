import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Eye, Search, Users, ArrowUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EventRow {
  id: string;
  title: string;
  event_date: string;
  location_name: string;
  created_by: string | null;
}

interface ViewRow {
  event_id: string;
  viewer_id: string | null;
  session_id: string | null;
}

interface AggregatedRow {
  id: string;
  title: string;
  event_date: string;
  location_name: string;
  host_name: string;
  total_views: number;
  unique_viewers: number;
}

type SortKey = "total_views" | "unique_viewers" | "event_date";

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const EventViewsStats = () => {
  const [rows, setRows] = useState<AggregatedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total_views");

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [eventsRes, viewsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, event_date, location_name, created_by")
          .order("event_date", { ascending: false }),
        supabase.from("event_views").select("event_id, viewer_id, session_id"),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (viewsRes.error) throw viewsRes.error;

      const events = (eventsRes.data ?? []) as EventRow[];
      const views = (viewsRes.data ?? []) as ViewRow[];

      // Fetch host names in one batch
      const creatorIds = Array.from(
        new Set(events.map((e) => e.created_by).filter(Boolean) as string[]),
      );
      const profilesById = new Map<string, string>();
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", creatorIds);
        (profiles ?? []).forEach((p: any) =>
          profilesById.set(p.user_id, p.name ?? "—"),
        );
      }

      // Aggregate
      const byEvent = new Map<
        string,
        { total: number; uniq: Set<string> }
      >();
      for (const v of views) {
        const entry = byEvent.get(v.event_id) ?? {
          total: 0,
          uniq: new Set<string>(),
        };
        entry.total += 1;
        const key = v.viewer_id ?? `s:${v.session_id ?? "anon"}`;
        entry.uniq.add(key);
        byEvent.set(v.event_id, entry);
      }

      const aggregated: AggregatedRow[] = events.map((e) => {
        const v = byEvent.get(e.id);
        return {
          id: e.id,
          title: e.title,
          event_date: e.event_date,
          location_name: e.location_name,
          host_name: e.created_by
            ? profilesById.get(e.created_by) ?? "—"
            : "—",
          total_views: v?.total ?? 0,
          unique_viewers: v?.uniq.size ?? 0,
        };
      });

      setRows(aggregated);
    } catch (err: any) {
      console.error(err);
      toast.error("Fehler beim Laden der View-Statistik");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.location_name.toLowerCase().includes(q) ||
            r.host_name.toLowerCase().includes(q),
        )
      : rows;
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "event_date") {
        return (
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        );
      }
      return (b[sortKey] as number) - (a[sortKey] as number);
    });
    return sorted;
  }, [rows, search, sortKey]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.views += r.total_views;
        acc.uniq += r.unique_viewers;
        return acc;
      },
      { views: 0, uniq: 0 },
    );
  }, [rows]);

  const exportCsv = () => {
    const header = [
      "Event",
      "Datum",
      "Ort",
      "Veranstalter",
      "Aufrufe gesamt",
      "Unique Besucher",
    ];
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          escape(r.title),
          escape(formatDate(r.event_date)),
          escape(r.location_name),
          escape(r.host_name),
          r.total_views,
          r.unique_viewers,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-views-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Lade Statistik…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border border-border rounded-2xl p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Events
          </p>
          <p className="text-foreground text-xl font-bold">{rows.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Aufrufe gesamt
          </p>
          <p className="text-foreground text-xl font-bold">{totals.views}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Unique
          </p>
          <p className="text-foreground text-xl font-bold">{totals.uniq}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Event, Ort oder Veranstalter…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSortKey((k) =>
                k === "total_views"
                  ? "unique_viewers"
                  : k === "unique_viewers"
                    ? "event_date"
                    : "total_views",
              )
            }
            className="shrink-0"
          >
            <ArrowUpDown className="w-4 h-4 mr-1" />
            {sortKey === "total_views"
              ? "Aufrufe"
              : sortKey === "unique_viewers"
                ? "Unique"
                : "Datum"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="shrink-0"
          >
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          Keine Events gefunden.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm truncate">
                  {r.title}
                </p>
                <p className="text-muted-foreground text-xs truncate">
                  {formatDate(r.event_date)} · {r.location_name}
                </p>
                <p className="text-muted-foreground text-[11px] truncate">
                  von {r.host_name}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  variant="outline"
                  className="gap-1 border-primary/30 text-foreground"
                >
                  <Eye className="w-3 h-3" /> {r.total_views}
                </Badge>
                <Badge
                  variant="outline"
                  className="gap-1 border-border text-muted-foreground"
                >
                  <Users className="w-3 h-3" /> {r.unique_viewers}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventViewsStats;
