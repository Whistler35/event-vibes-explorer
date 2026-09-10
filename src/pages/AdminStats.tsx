import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, Zap, Users, Heart, MessageSquare, Flag,
  ShieldCheck, UserPlus, Trash2, Search,
} from "lucide-react";

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

interface Person {
  user_id: string;
  name: string;
  avatar_url: string | null;
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
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [range, setRange] = useState<Range>("7d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin management
  const [admins, setAdmins] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [roleBusy, setRoleBusy] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate("/", { replace: true });
  }, [adminLoading, isAdmin, navigate]);

  const load = async (r: Range) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("admin_stats", { p_from: rangeStart(r) });
    if (error) setError(error.message);
    else setStats(data as unknown as Stats);
    setLoading(false);
  };

  const loadAdmins = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) { setAdmins([]); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", ids);
    // keep admins without a profile row visible too
    const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    setAdmins(ids.map((id) => byId.get(id) ?? { user_id: id, name: "(ohne Profil)", avatar_url: null }));
  };

  useEffect(() => {
    if (isAdmin) { load(range); loadAdmins(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, range]);

  // debounced user search
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .ilike("name", `%${term}%`)
        .limit(10);
      const adminIds = new Set(admins.map((a) => a.user_id));
      setResults(((data ?? []) as Person[]).filter((p) => !adminIds.has(p.user_id)));
    }, 300);
    return () => clearTimeout(t);
  }, [q, admins]);

  const promote = async (p: Person) => {
    setRoleBusy(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: p.user_id, role: "admin" } as any);
    setRoleBusy(false);
    if (error && !/(duplicate|unique)/i.test(error.message)) {
      toast.error(error.message);
      return;
    }
    toast.success(`${p.name} ist jetzt Admin`);
    setQ("");
    setResults([]);
    loadAdmins();
  };

  const demote = async (p: Person) => {
    if (p.user_id === user?.id) {
      toast.error("Du kannst dich nicht selbst als Admin entfernen.");
      return;
    }
    if (admins.length <= 1) {
      toast.error("Es muss mindestens ein Admin bleiben.");
      return;
    }
    setRoleBusy(true);
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", p.user_id)
      .eq("role", "admin");
    setRoleBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${p.name} ist kein Admin mehr`);
    loadAdmins();
  };

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

  const avatar = (p: Person) =>
    p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=1E3323&color=fff&size=80`;

  return (
    <Layout>
      <div className="p-4 space-y-6">
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
            onClick={() => { load(range); loadAdmins(); }}
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
          <p className="text-[11px] text-muted-foreground text-center">
            Zeitraum: {range === "all" ? "seit Beginn" : `letzte ${RANGE_LABEL[range]}`} ·
            {" "}Stand {new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        {/* ── Admins verwalten ─────────────────────────────── */}
        <div className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[hsl(var(--blitz-forest))]" />
            <h2 className="text-sm font-bold">Admins</h2>
            <span className="text-xs text-muted-foreground">({admins.length})</span>
          </div>

          <div className="space-y-1.5">
            {admins.map((a) => (
              <div key={a.user_id} className="flex items-center gap-3 py-1.5">
                <img src={avatar(a)} alt="" className="w-8 h-8 rounded-full object-cover" />
                <span className="text-sm font-medium flex-1 truncate">{a.name}</span>
                {a.user_id === user?.id ? (
                  <span className="text-[11px] text-muted-foreground">du</span>
                ) : (
                  <button
                    onClick={() => demote(a)}
                    disabled={roleBusy}
                    className="text-destructive/80 hover:text-destructive p-1.5 disabled:opacity-40"
                    aria-label="Admin entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-1">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nutzer suchen, um Admin zu machen…"
                className="bg-transparent outline-none text-sm w-full"
              />
            </div>
            {results.length > 0 && (
              <div className="mt-2 space-y-1">
                {results.map((r) => (
                  <div key={r.user_id} className="flex items-center gap-3 py-1.5">
                    <img src={avatar(r)} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <span className="text-sm flex-1 truncate">{r.name}</span>
                    <button
                      onClick={() => promote(r)}
                      disabled={roleBusy}
                      className="flex items-center gap-1 text-xs font-semibold text-[hsl(var(--blitz-forest))] hover:opacity-80 px-2 py-1 disabled:opacity-40"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Admin
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Admins sehen diese Statistik-Seite und können weitere Admins ernennen. Ändert nichts am Login.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AdminStats;
