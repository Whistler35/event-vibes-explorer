import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ArrowLeft, RefreshCw, Zap, Users, Heart, MessageSquare, Flag } from "lucide-react";

type Range = "today" | "7d" | "30d" | "all";

interface Stats {
  users_total: number;
  users_new: number;
  blitz_total: number;
  blitz_new: number;
  blitz_active: number;
  swipes_new: number;
  swipes_right_new: number;
  matches_total: number;
  matches_new: number;
  blitz_messages_new: number;
  dm_messages_new: number;
  reports_open: number;
}

const RANGE_LABEL: Record<Range, string> = {
  today: "Heute",
  "7d": "7 Tage",
  "30d": "30 Tage",
  all: "Gesamt",
};

function rangeStart(r: Range): string | null {
  if (r === "all") return null;
  const d = new Date();
  if (r === "today") d.setHours(0, 0, 0, 0);
  else if (r === "7d") d.setDate(d.getDate() - 7);
  else if (r === "30d") d.setDate(d.getDate() - 30);
  return d.toISOString();
}

const AdminStats = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [range, setRange] = useState<Range>("7d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/", { replace: true });
  }, [adminLoading, isAdmin, navigate]);

  const load = async (r: Range) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("admin_stats" as any, { p_from: rangeStart(r) });
    if (error) setError(error.message);
    else setStats(data as unknown as Stats);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, range]);

  const cards = useMemo(() => {
    if (!stats) return [];
    const suffix = range === "all" ? "" : ` (${RANGE_LABEL[range]})`;
    return [
      { icon: Users, label: "Nutzer gesamt", value: stats.users_total, sub: `+${stats.users_new} neu${suffix}` },
      { icon: Zap, label: `Blitze${suffix}`, value: stats.blitz_new, sub: `${stats.blitz_total} gesamt · ${stats.blitz_active} aktiv` },
      { icon: Heart, label: `Matches${suffix}`, value: stats.matches_new, sub: `${stats.matches_total} gesamt` },
      { icon: RefreshCw, label: `Swipes${suffix}`, value: stats.swipes_new, sub: `davon ${stats.swipes_right_new}× rechts` },
      { icon: MessageSquare, label: `Nachrichten${suffix}`, value: stats.blitz_messages_new + stats.dm_messages_new, sub: `${stats.blitz_messages_new} Blitz · ${stats.dm_messages_new} DM` },
      { icon: Flag, label: "Offene Meldungen", value: stats.reports_open, sub: stats.reports_open > 0 ? "prüfen" : "alles ok" },
    ];
  }, [stats, range]);

  return (
    <Layout>
      <div className="p-4 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Admin · Statistiken</h1>
          <button
            onClick={() => load(range)}
            className="ml-auto w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm"
            aria-label="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex gap-2">
          {(["today", "7d", "30d", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                range === r
                  ? "bg-[hsl(var(--blitz-forest))] text-white"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
            {error === "not authorized"
              ? "Kein Admin-Zugriff."
              : `Fehler beim Laden: ${error}`}
          </div>
        )}

        {loading && !stats ? (
          <div className="text-muted-foreground text-sm py-12 text-center">Lädt…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <c.icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{c.label}</span>
                </div>
                <p className="text-2xl font-bold leading-none">{c.value.toLocaleString("de-DE")}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{c.sub}</p>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <p className="text-[11px] text-muted-foreground text-center pt-2">
            Zeitraum: {range === "all" ? "seit Beginn" : `letzte ${RANGE_LABEL[range]}`} ·
            {" "}Stand {new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </Layout>
  );
};

export default AdminStats;
