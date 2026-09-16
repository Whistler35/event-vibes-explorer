import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Check, Loader2, MapPin, Bell, Users, Zap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import FriendSearch from "@/components/FriendSearch";

type Step = 0 | 1 | 2 | 3 | 4;

const TOTAL_STEPS = 5;
type Screen = "flow" | "ready";

const INTERESTS = [
  "Tennis", "Fußball", "Padel", "Basketball", "Volleyball",
  "Laufen", "Yoga", "Klettern", "Wandern", "Radfahren",
  "Skifahren", "Snowboard", "Schwimmen", "Surfen", "Bouldern",
  "Kaffee", "Brunch", "Bar", "Kino", "Konzert",
  "Kochen", "Kunst", "Museum", "Fotografie", "Gaming",
  "Lesen", "Reisen", "Party",
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { subscribe } = usePushNotifications();

  const [step, setStep] = useState<Step>(0);
  const [screen, setScreen] = useState<Screen>("flow");
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // Gate the very first render on the "already onboarded?" check — without
  // this, the step-1 UI ("Wer bist du?") flashes for a moment on every app
  // open before the redirect to /blitz kicks in.
  const [checkingOnboarded, setCheckingOnboarded] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth", { replace: true }); return; }
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("name, avatar_url, interests, onboarding_completed")
        .eq("user_id", user.id).maybeSingle() as any;
      if (data?.onboarding_completed) { navigate("/blitz", { replace: true }); return; }
      if (data) {
        setName(data.name || "");
        setAvatarUrl(data.avatar_url || null);
        setInterests(data.interests || []);
      }
      setCheckingOnboarded(false);
    })();
  }, [user, navigate]);

  if (checkingOnboarded) {
    return <div className="min-h-screen bg-[hsl(var(--blitz-forest))]" />;
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const toggleInterest = (i: string) => {
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const requestLocation = async () => {
    if (!("geolocation" in navigator)) { toast.error("Standort nicht verfügbar"); return; }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      () => { setLocationGranted(true); setLocationBusy(false); toast.success("Standort aktiviert"); },
      () => { setLocationBusy(false); toast.error("Standort abgelehnt – du kannst das später ändern"); },
      { timeout: 10_000 }
    );
  };

  const requestPush = async () => {
    setPushBusy(true);
    try { await subscribe(); toast.success("Benachrichtigungen aktiviert"); }
    catch { /* silent */ }
    finally { setPushBusy(false); next(); }
  };

  const next = () => setStep(s => Math.min(TOTAL_STEPS - 1, (s + 1)) as Step);
  const skip = () => next();

  const finish = async () => {
    if (!user) return;
    setFinishing(true);
    try {
      const payload = {
        user_id: user.id,
        name: name.trim() || "Anonym",
        avatar_url: avatarUrl,
        interests,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      const { error } = existing
        ? await supabase.from("profiles").update(payload).eq("user_id", user.id)
        : await supabase.from("profiles").insert(payload as any);
      if (error) throw error;
      toast.success("Willkommen bei EVENDLE ⚡");
      setScreen("ready");
    } catch (err: any) {
      toast.error(err.message || "Speichern fehlgeschlagen");
    } finally {
      setFinishing(false);
    }
  };

  const canNext = () => {
    if (step === 0) return !!name.trim(); // profile photo is optional
    if (step === 1) return interests.length >= 3;
    return true;
  };

  const avatarPreview = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=173518&color=fff&size=400`;

  if (screen === "ready") {
    const firstName = (name.trim().split(" ")[0]) || "friend";
    return (
      <div
        className="fixed inset-0 flex flex-col text-white"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, hsl(var(--blitz-forest-mid)) 0%, hsl(var(--blitz-forest-dark)) 55%, hsl(var(--blitz-forest-deep)) 100%)",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
          <div className="relative w-32 h-32 rounded-full bg-[hsl(var(--bolt))] flex items-center justify-center animate-blitz-pulse">
            <Zap className="w-16 h-16 text-[hsl(var(--ink))] fill-[hsl(var(--ink))]" strokeWidth={2} />
          </div>
          <div className="text-center space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.4em] text-[hsl(var(--bolt))]">
              EVENDLE
            </p>
            <h1 className="font-display text-[40px] font-bold leading-[1.05] tracking-tight">
              You're in, {firstName}.
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-xs mx-auto">
              Send your first Blitz — or just see what's happening around you.
            </p>
          </div>
        </div>
        <div className="px-6 pb-8 space-y-3">
          <Button
            onClick={() => navigate("/blitz?create=1", { replace: true })}
            className="w-full h-14 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--ink))] hover:bg-[hsl(var(--bolt))]/90 font-bold text-base"
            style={{ boxShadow: "0 10px 30px hsl(var(--bolt) / 0.25)" }}
          >
            <Zap className="w-5 h-5 mr-2 fill-[hsl(var(--ink))]" /> Send a Blitz
          </Button>
          <button
            onClick={() => navigate("/blitz", { replace: true })}
            className="w-full h-14 rounded-full border border-white/20 text-white font-semibold text-[15px] active:scale-[0.98] transition"
          >
            Just look around
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--blitz-forest))] text-white flex flex-col">
      {/* Progress */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-white" : "bg-white/20"}`} />
        ))}
      </div>

      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        {step === 0 && (
          <div className="space-y-6 pt-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Wer bist du?</h1>
              <p className="text-white/70 text-sm mt-1">Vorname reicht – ein Foto ist optional (kannst du später im Profil ergänzen).</p>
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white/20">
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-11 h-11 rounded-full bg-white text-[hsl(var(--blitz-forest))] flex items-center justify-center shadow-lg"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </div>
              {avatarUrl ? (
                <button
                  onClick={() => setAvatarUrl(null)}
                  className="text-white/50 text-xs underline"
                >
                  Foto entfernen
                </button>
              ) : (
                <p className="text-white/40 text-xs">Foto überspringen ist ok 🙂</p>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-white/80">Vorname</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Lea"
                className="mt-2 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 pt-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Was zockst du?</h1>
              <p className="text-white/70 text-sm mt-1">Wähle mindestens 3 – wir zeigen dir passende Blitze.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const active = interests.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                      active ? "bg-white text-[hsl(var(--blitz-forest))]" : "bg-white/10 text-white border border-white/20"
                    }`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
            <p className="text-white/50 text-xs">{interests.length} ausgewählt</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 pt-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <MapPin className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Standort teilen</h1>
              <p className="text-white/70 text-sm mt-2 leading-relaxed">
                Wir zeigen dir Blitze in deiner Nähe – deine genaue Position bleibt privat,
                andere sehen nur die ungefähre Entfernung.
              </p>
            </div>
            <Button
              onClick={requestLocation}
              disabled={locationBusy || locationGranted}
              className="w-full h-14 rounded-2xl bg-white text-[hsl(var(--blitz-forest))] hover:bg-white/90 font-bold text-base"
            >
              {locationBusy ? <Loader2 className="w-5 h-5 animate-spin" /> :
                locationGranted ? <><Check className="w-5 h-5 mr-2" /> Aktiviert</> :
                "Standort erlauben"}
            </Button>
            <button onClick={skip} className="w-full text-white/60 text-sm underline">
              Später einstellen
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 pt-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Finde deine Crew</h1>
              <p className="text-white/70 text-sm mt-2 leading-relaxed">
                Suche Freund:innen, die schon auf EVENDLE sind – oder überspring das jetzt und lade sie später ein.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <FriendSearch />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 pt-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Bell className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Blitz-Alarm an?</h1>
              <p className="text-white/70 text-sm mt-2 leading-relaxed">
                Krieg einen Ping, wenn Freund:innen blitzen oder ein Match reinkommt.
                Ohne Push verpasst du die spontanen Momente.
              </p>
            </div>
            <Button
              onClick={requestPush}
              disabled={pushBusy}
              className="w-full h-14 rounded-2xl bg-white text-[hsl(var(--blitz-forest))] hover:bg-white/90 font-bold text-base"
            >
              {pushBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5 mr-2 fill-current" /> Benachrichtigungen an</>}
            </Button>
            <button onClick={finish} className="w-full text-white/60 text-sm underline">
              Ohne Push starten
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 pt-2 flex items-center gap-3">
        {step > 0 && step < 4 && (
          <button
            onClick={skip}
            className="text-white/60 text-sm px-3 py-2"
          >
            Überspringen
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <Button
            onClick={next}
            disabled={!canNext()}
            className="h-12 px-6 rounded-2xl bg-white text-[hsl(var(--blitz-forest))] hover:bg-white/90 font-bold disabled:opacity-40"
          >
            Weiter <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={finish}
            disabled={finishing}
            className="h-12 px-6 rounded-2xl bg-white text-[hsl(var(--blitz-forest))] hover:bg-white/90 font-bold"
          >
            {finishing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Loslegen ⚡"}
          </Button>
        )}
      </div>
    </div>
  );
}
