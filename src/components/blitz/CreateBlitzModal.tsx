import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Zap,
  MapPin,
  Loader2,
  Globe2,
  Users,
  UserCheck,
  Check,
  ImagePlus,
  X,
  Search,
  Shield,
} from "lucide-react";
import { createBlitzRequest, BlitzAudience } from "@/hooks/useBlitzRequest";
import { useFriendGroups } from "@/hooks/useFriendGroups";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { Geolocation } from "@capacitor/geolocation";
import { uploadBlitzImage, uploadBlitzLogo } from "@/lib/blitzImage";
import { searchPlaces, GeoPlace } from "@/lib/geocode";

interface CreateBlitzModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
];

const RADIUS_MIN = 1;
const RADIUS_MAX = 50;
const RADIUS_STEP = 5;

// Admin-only custom duration. The DB allows up to 10 years; the UI caps the
// same so a typo can't create something absurd.
const MAX_DURATION_MINUTES = 5_256_000;
const UNIT_MINUTES = { min: 1, h: 60, d: 1440 } as const;
type DurationUnit = keyof typeof UNIT_MINUTES;

const FREIFELD_STORAGE_KEY = "evendle.blitzFreifeld";

const loadFreifeld = (): { name: string; logo: string | null } => {
  try {
    const raw = localStorage.getItem(FREIFELD_STORAGE_KEY);
    if (!raw) return { name: "", logo: null };
    const parsed = JSON.parse(raw);
    return { name: typeof parsed.name === "string" ? parsed.name : "", logo: parsed.logo ?? null };
  } catch {
    return { name: "", logo: null };
  }
};

const CreateBlitzModal = ({ open, onOpenChange, onCreated }: CreateBlitzModalProps) => {
  const { t, i18n } = useTranslation();
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState(60);
  const [radius, setRadius] = useState(10);
  const [audience, setAudience] = useState<BlitzAudience>("public");
  // Selection model for "Auswählen": groups are tracked explicitly, so
  // choosing group A never lights up group B just because they share a
  // member. A friend counts as selected if they come in through a selected
  // group (unless individually un-ticked) or were ticked by hand.
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Admin-only options
  const [customDuration, setCustomDuration] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [customUnit, setCustomUnit] = useState<DurationUnit>("h");
  const [origin, setOrigin] = useState<GeoPlace | null>(null);
  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState<GeoPlace[] | null>(null);
  const [originSearching, setOriginSearching] = useState(false);
  const [senderMode, setSenderMode] = useState<"me" | "free">("me");
  const [freeName, setFreeName] = useState("");
  const [freeLogo, setFreeLogo] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { groups } = useFriendGroups(user?.id);

  const { data: friends = [] } = useQuery({
    queryKey: ["blitz-friend-picker", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      if (!user) return [];
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");
      const ids = (fs || []).map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      return (profiles || []) as { user_id: string; name: string; avatar_url: string | null }[];
    },
  });

  const groupMemberIds = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      if (selectedGroupIds.includes(g.id)) g.memberIds.forEach((id) => set.add(id));
    }
    return set;
  }, [groups, selectedGroupIds]);

  const selectedFriendIds = useMemo(() => {
    const set = new Set<string>();
    groupMemberIds.forEach((id) => {
      if (!excludedIds.includes(id)) set.add(id);
    });
    manualIds.forEach((id) => set.add(id));
    return Array.from(set);
  }, [groupMemberIds, excludedIds, manualIds]);

  const requestLocation = async () => {
    setLocating(true);
    setLocError(null);
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err: any) {
      setLocError(
        err?.message?.toLowerCase().includes("denied") ? t("createBlitz.locDenied") : t("createBlitz.locFailed")
      );
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (open && !coords) requestLocation();
    if (open) {
      const saved = loadFreifeld();
      setFreeName(saved.name);
      setFreeLogo(saved.logo);
    }
    if (!open) {
      // reset on close
      setActivity("");
      setDuration(60);
      setRadius(10);
      setAudience("public");
      setSelectedGroupIds([]);
      setManualIds([]);
      setExcludedIds([]);
      setImageUrl(null);
      setCustomDuration(false);
      setCustomAmount("");
      setCustomUnit("h");
      setOrigin(null);
      setOriginQuery("");
      setOriginResults(null);
      setSenderMode("me");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleFriend = (id: string) => {
    if (selectedFriendIds.includes(id)) {
      setManualIds((prev) => prev.filter((x) => x !== id));
      if (groupMemberIds.has(id)) setExcludedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setManualIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setExcludedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const toggleGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    if (selectedGroupIds.includes(groupId)) {
      const remaining = selectedGroupIds.filter((id) => id !== groupId);
      const stillCovered = new Set<string>();
      groups.forEach((g) => {
        if (remaining.includes(g.id)) g.memberIds.forEach((id) => stillCovered.add(id));
      });
      setSelectedGroupIds(remaining);
      // Members that are no longer covered by any group don't need an
      // "un-ticked" marker any more.
      setExcludedIds((prev) => prev.filter((id) => stillCovered.has(id)));
      // Ticking a group then un-ticking it again should not leave its members
      // selected, but hand-picked friends stay.
    } else {
      setSelectedGroupIds((prev) => [...prev, groupId]);
      setExcludedIds((prev) => prev.filter((id) => !group.memberIds.includes(id)));
    }
  };

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setImageUploading(true);
    try {
      setImageUrl(await uploadBlitzImage(user.id, file));
    } catch (err: any) {
      toast.error(err?.message || t("createBlitz.errUpload"));
    } finally {
      setImageUploading(false);
    }
  };

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setLogoUploading(true);
    try {
      setFreeLogo(await uploadBlitzLogo(user.id, file));
    } catch (err: any) {
      toast.error(err?.message || t("createBlitz.errUpload"));
    } finally {
      setLogoUploading(false);
    }
  };

  const runOriginSearch = async () => {
    if (originQuery.trim().length < 2) return;
    setOriginSearching(true);
    try {
      setOriginResults(await searchPlaces(originQuery, i18n.language?.startsWith("en") ? "en" : "de"));
    } catch {
      setOriginResults(null);
      toast.error(t("createBlitz.originSearchFailed"));
    } finally {
      setOriginSearching(false);
    }
  };

  const customMinutes = (() => {
    const amount = Number(customAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const minutes = Math.round(amount * UNIT_MINUTES[customUnit]);
    return minutes >= 15 && minutes <= MAX_DURATION_MINUTES ? minutes : null;
  })();

  const effectiveDuration = isAdmin && customDuration ? customMinutes : duration;
  const effectiveCoords = isAdmin && origin ? { lat: origin.lat, lng: origin.lng } : coords;
  const useFreifeld = isAdmin && senderMode === "free";

  const handleSubmit = async () => {
    if (!activity.trim()) {
      toast.error(t("createBlitz.errActivity"));
      return;
    }
    if (!effectiveCoords) {
      toast.error(t("createBlitz.errLocation"));
      return;
    }
    if (!effectiveDuration) {
      toast.error(t("createBlitz.errDuration"));
      return;
    }
    if (audience === "selected" && selectedFriendIds.length === 0) {
      toast.error(t("createBlitz.errPickFriend"));
      return;
    }
    if (useFreifeld && !freeName.trim()) {
      toast.error(t("createBlitz.errFreeName"));
      return;
    }
    setSubmitting(true);
    try {
      const city =
        isAdmin && origin
          ? origin.label.split(",")[0].trim()
          : localStorage.getItem("evendle.selectedCity") ||
            localStorage.getItem("evendle_selected_city") ||
            null;
      await createBlitzRequest({
        activity,
        durationMinutes: effectiveDuration,
        city,
        latitude: effectiveCoords.lat,
        longitude: effectiveCoords.lng,
        radiusKm: radius,
        audience,
        targetUserIds: audience === "selected" ? selectedFriendIds : undefined,
        imageUrl,
        displayName: useFreifeld ? freeName : null,
        displayAvatarUrl: useFreifeld ? freeLogo : null,
      });
      if (useFreifeld) {
        try {
          localStorage.setItem(FREIFELD_STORAGE_KEY, JSON.stringify({ name: freeName.trim(), logo: freeLogo }));
        } catch {}
      }
      trackEvent(user?.id, "blitz_created", { audience });
      toast.success(
        audience === "selected"
          ? t("createBlitz.sentSelected", { count: selectedFriendIds.length })
          : audience === "friends"
          ? t("createBlitz.sentFriends")
          : t("createBlitz.sent")
      );
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || t("createBlitz.errCreate"));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    !submitting &&
    !imageUploading &&
    !logoUploading &&
    !!activity.trim() &&
    !!effectiveCoords &&
    !!effectiveDuration &&
    (audience !== "selected" || selectedFriendIds.length > 0) &&
    (!useFreifeld || !!freeName.trim());

  const sectionLabel = "text-[11px] font-black uppercase tracking-[0.25em] text-white/55";
  const optionClass = (active: boolean) =>
    `transition border-2 ${
      active
        ? "bg-[hsl(var(--bolt))]/10 border-[hsl(var(--bolt))] text-[hsl(var(--bolt))]"
        : "bg-white/5 border-white/10 text-white/80"
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-screen sm:w-[calc(100vw-1rem)] max-w-md p-0 border-0 bg-[hsl(var(--blitz-forest))] text-white h-[100dvh] sm:h-auto sm:max-h-[92dvh] overflow-hidden rounded-none sm:rounded-[28px] top-auto bottom-0 left-1/2 -translate-x-1/2 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 flex flex-col [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:z-20 [&>button]:top-[max(1rem,calc(env(safe-area-inset-top,0px)+0.5rem))]"
      >
        <VisuallyHidden>
          <DialogTitle>{t("createBlitz.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("createBlitz.dialogDescription")}</DialogDescription>
        </VisuallyHidden>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="px-5 pt-[max(2rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-6 space-y-5 min-w-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-[hsl(var(--blitz-forest-deep))]/60 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[hsl(var(--bolt))] fill-[hsl(var(--bolt))]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/55 font-black">{t("createBlitz.eyebrow")}</p>
              <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight truncate">
                {t("createBlitz.title")}
              </h2>
            </div>
          </div>

          <div className="space-y-2">
            <label className={sectionLabel}>{t("createBlitz.activityLabel")}</label>
            <input
              autoFocus
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder={t("createBlitz.activityPlaceholder")}
              maxLength={80}
              className="block w-full min-w-0 max-w-full bg-transparent border-b border-white/25 focus:border-[hsl(var(--bolt))] outline-none text-base sm:text-lg font-black placeholder:text-white/25 py-3 transition truncate"
            />
          </div>

          {/* Optional picture — shown on the back of the card in Discover */}
          <div className="space-y-2">
            <label className={sectionLabel}>{t("createBlitz.photoLabel")}</label>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <img src={imageUrl} alt="" className="w-full max-h-48 object-cover" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-full bg-black/55 text-white text-[11px] font-black uppercase tracking-wide backdrop-blur-sm"
                  >
                    {t("createBlitz.changePhoto")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    aria-label={t("createBlitz.removePhoto")}
                    className="w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-white/20 text-white/75 text-sm font-bold hover:bg-white/5 transition disabled:opacity-60"
              >
                {imageUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("createBlitz.uploadingPhoto")}
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4" /> {t("createBlitz.addPhoto")}
                  </>
                )}
              </button>
            )}
            <p className="text-[11px] text-white/45">{t("createBlitz.photoHint")}</p>
          </div>

          <div className="space-y-3">
            <label className={sectionLabel}>{t("createBlitz.durationLabel")}</label>
            <div className={`grid gap-2 ${isAdmin ? "grid-cols-4" : "grid-cols-3"}`}>
              {DURATIONS.map((d) => {
                const active = !customDuration && duration === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => {
                      setCustomDuration(false);
                      setDuration(d.value);
                    }}
                    className={`py-4 rounded-2xl font-black text-lg ${optionClass(active)}`}
                  >
                    {d.label}
                  </button>
                );
              })}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setCustomDuration(true)}
                  className={`py-4 rounded-2xl font-black text-sm leading-tight px-1 ${optionClass(customDuration)}`}
                >
                  {t("createBlitz.customDuration")}
                </button>
              )}
            </div>
            {isAdmin && customDuration && (
              <div className="flex gap-2">
                <input
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={t("createBlitz.durationAmount")}
                  className="flex-1 min-w-0 rounded-2xl bg-white/5 border-2 border-white/10 focus:border-[hsl(var(--bolt))] outline-none px-4 py-3 text-lg font-black"
                />
                <div className="grid grid-cols-3 gap-1 shrink-0">
                  {(["min", "h", "d"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setCustomUnit(u)}
                      className={`px-3 rounded-2xl text-xs font-black uppercase ${optionClass(customUnit === u)}`}
                    >
                      {u === "min"
                        ? t("createBlitz.unitMinutes")
                        : u === "h"
                        ? t("createBlitz.unitHours")
                        : t("createBlitz.unitDays")}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className={sectionLabel}>{t("createBlitz.radiusLabel")}</label>
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={RADIUS_STEP}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-[hsl(var(--bolt))] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] uppercase tracking-widest font-black">
              <span className="text-white/40">{RADIUS_MIN} KM</span>
              <span className="text-[hsl(var(--bolt))]">{radius} KM</span>
              <span className="text-white/40">{RADIUS_MAX} KM</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className={sectionLabel}>{t("createBlitz.visibilityLabel")}</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "public", label: t("createBlitz.public"), Icon: Globe2 },
                { value: "friends", label: t("createBlitz.friends"), Icon: Users },
                { value: "selected", label: t("createBlitz.selected"), Icon: UserCheck },
              ] as const).map(({ value, label, Icon }) => {
                const active = audience === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAudience(value)}
                    className={`p-3 rounded-2xl text-center ${optionClass(active)}`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <Icon className="w-5 h-5" />
                      <span className="font-black text-[11px] uppercase tracking-wide">{label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {audience === "selected" && groups.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`shrink-0 px-3 py-2 rounded-full text-xs font-bold ${optionClass(
                      selectedGroupIds.includes(g.id)
                    )}`}
                  >
                    {g.name} · {g.memberIds.length}
                  </button>
                ))}
              </div>
            )}

            {audience === "selected" && (
              <div className="mt-2 rounded-2xl bg-white/5 border border-white/10 p-2 max-h-56 overflow-y-auto space-y-1">
                {friends.length === 0 ? (
                  <p className="text-xs text-white/60 text-center py-6">{t("createBlitz.noFriends")}</p>
                ) : (
                  friends.map((f) => {
                    const selected = selectedFriendIds.includes(f.user_id);
                    const avatar =
                      f.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || "?")}&background=1E3323&color=fff&size=80`;
                    return (
                      <button
                        key={f.user_id}
                        type="button"
                        onClick={() => toggleFriend(f.user_id)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition ${
                          selected ? "bg-[hsl(var(--bolt))]/15" : "hover:bg-white/5"
                        }`}
                      >
                        <img src={avatar} alt={f.name} loading="lazy" className="w-8 h-8 rounded-full object-cover" />
                        <span className="flex-1 text-left text-sm font-semibold text-white truncate">
                          {f.name}
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selected
                              ? "bg-[hsl(var(--bolt))] border-[hsl(var(--bolt))]"
                              : "border-white/30"
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 text-[hsl(var(--blitz-forest))]" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })
                )}
                {selectedFriendIds.length > 0 && (
                  <p className="text-[10px] text-white/60 text-center pt-2 uppercase tracking-widest font-bold">
                    {t("createBlitz.selectedCount", { count: selectedFriendIds.length })}
                  </p>
                )}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="rounded-2xl border border-[hsl(var(--bolt))]/30 bg-[hsl(var(--bolt))]/5 p-4 space-y-5">
              <div className="flex items-center gap-2 text-[hsl(var(--bolt))] text-[11px] font-black uppercase tracking-[0.25em]">
                <Shield className="w-3.5 h-3.5" /> {t("createBlitz.adminSection")}
              </div>

              {/* Origin: send the Blitz from anywhere, radius counts from there */}
              <div className="space-y-2">
                <label className={sectionLabel}>{t("createBlitz.originLabel")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOrigin(null);
                      setOriginResults(null);
                    }}
                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wide ${optionClass(!origin)}`}
                  >
                    {t("createBlitz.originMine")}
                  </button>
                  <div className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wide text-center truncate px-2 ${optionClass(!!origin)}`}>
                    {origin ? origin.label : t("createBlitz.originSearch")}
                  </div>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runOriginSearch();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={originQuery}
                    onChange={(e) => setOriginQuery(e.target.value)}
                    placeholder={t("createBlitz.originSearchPlaceholder")}
                    className="flex-1 min-w-0 rounded-2xl bg-white/5 border-2 border-white/10 focus:border-[hsl(var(--bolt))] outline-none px-4 py-3 text-sm font-semibold placeholder:text-white/30"
                  />
                  <button
                    type="submit"
                    disabled={originSearching || originQuery.trim().length < 2}
                    aria-label={t("createBlitz.originSearch")}
                    className="shrink-0 w-12 rounded-2xl bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] flex items-center justify-center disabled:opacity-50"
                  >
                    {originSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </form>
                {originResults && (
                  <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                    {originResults.length === 0 ? (
                      <p className="text-xs text-white/60 text-center py-4">{t("createBlitz.originNoResults")}</p>
                    ) : (
                      originResults.map((r, i) => (
                        <button
                          key={`${r.lat}-${r.lng}-${i}`}
                          type="button"
                          onClick={() => {
                            setOrigin(r);
                            setOriginResults(null);
                            setOriginQuery("");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-3 text-left text-sm font-semibold hover:bg-white/5 border-b border-white/5 last:border-0"
                        >
                          <MapPin className="w-4 h-4 text-[hsl(var(--bolt))] shrink-0" />
                          <span className="truncate">{r.label}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Sender: own name or a free-form "Freifeld" */}
              <div className="space-y-2">
                <label className={sectionLabel}>{t("createBlitz.senderLabel")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSenderMode("me")}
                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wide ${optionClass(senderMode === "me")}`}
                  >
                    {t("createBlitz.senderMe")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSenderMode("free")}
                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wide ${optionClass(senderMode === "free")}`}
                  >
                    {t("createBlitz.senderFree")}
                  </button>
                </div>
                {senderMode === "free" && (
                  <div className="flex items-center gap-3">
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={pickLogo} />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      aria-label={freeLogo ? t("createBlitz.freeLogoChange") : t("createBlitz.freeLogoAdd")}
                      className="shrink-0 w-14 h-14 rounded-full border-2 border-dashed border-white/25 overflow-hidden flex items-center justify-center bg-white/5"
                    >
                      {logoUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : freeLogo ? (
                        <img src={freeLogo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus className="w-5 h-5 text-white/70" />
                      )}
                    </button>
                    <input
                      value={freeName}
                      onChange={(e) => setFreeName(e.target.value)}
                      maxLength={60}
                      placeholder={t("createBlitz.freeNamePlaceholder")}
                      className="flex-1 min-w-0 rounded-2xl bg-white/5 border-2 border-white/10 focus:border-[hsl(var(--bolt))] outline-none px-4 py-3 text-base font-black placeholder:text-white/30"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
            {isAdmin && origin ? (
              <>
                <MapPin className="w-5 h-5 text-[hsl(var(--bolt))] shrink-0" />
                <span className="text-sm text-white/80">
                  {t("createBlitz.originFrom", { place: origin.label })} · {radius} km
                </span>
              </>
            ) : locating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                <span className="text-sm text-white/70">{t("createBlitz.locating")}</span>
              </>
            ) : coords ? (
              <>
                <MapPin className="w-5 h-5 text-[hsl(var(--bolt))]" />
                <span className="text-sm text-white/80">{t("createBlitz.locationActive", { radius })}</span>
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5 text-white/50" />
                <div className="flex-1 text-sm text-white/70">
                  {locError ?? t("createBlitz.locationRequired")}
                </div>
                <button
                  onClick={requestLocation}
                  className="px-3 py-1.5 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] text-[11px] font-black uppercase tracking-wider"
                >
                  {t("createBlitz.allow")}
                </button>
              </>
            )}
          </div>
        </div>
        </div>

        {/* Sticky bottom CTA — always visible */}
        <div
          className="shrink-0 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-[hsl(var(--blitz-forest))] border-t border-white/5"
        >
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-5 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] font-black text-lg tracking-[0.15em] uppercase shadow-[0_12px_32px_-8px_hsl(var(--bolt)/0.6)] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5 fill-[hsl(var(--blitz-forest))]" />
            {submitting ? t("createBlitz.submitting") : t("createBlitz.submit")}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full mt-2 py-3 text-white/60 hover:text-white text-sm font-semibold tracking-wide transition disabled:opacity-40"
          >
            {t("createBlitz.cancel")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBlitzModal;
