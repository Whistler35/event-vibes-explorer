import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/lib/countries";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Camera, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteOwnAccount } from "@/lib/moderation";
import BlockedUsersList from "@/components/profile/BlockedUsersList";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Switch } from "@/components/ui/switch";

const EditProfile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [ritualPushEnabled, setRitualPushEnabled] = useState(true);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t('editProfile.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error(t('auth.errors.passwordMismatch'));
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t('editProfile.passwordChanged'));
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim().toUpperCase() !== "LÖSCHEN") {
      toast.error('Bitte "LÖSCHEN" eintippen, um zu bestätigen');
      return;
    }
    setDeleting(true);
    try {
      await deleteOwnAccount();
      toast.success("Dein Konto wurde gelöscht.");
      navigate("/");
    } catch (e: any) {
      toast.error(e?.message ?? "Konto konnte nicht gelöscht werden");
      setDeleting(false);
    }
  };

  const [form, setForm] = useState({
    name: "",
    birthday: "",
    country: "",
    bio: "",
    avatar_url: "",
    instagram_username: "",
    instagram_followers: "",
    interests: [] as string[],
  });
  const [interestInput, setInterestInput] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const { data: profileRow, isLoading: loading } = useQuery({
    queryKey: ["edit-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, birthday, country, bio, avatar_url, instagram_username, instagram_followers, interests, ritual_push_enabled")
        .eq("user_id", user!.id)
        .maybeSingle() as any;
      if (error) throw error;
      return data;
    },
  });

  // Populate the editable form once the fetch resolves (or re-resolves —
  // e.g. after a background refresh) without clobbering in-progress edits
  // on every refetch, only on an actual identity change.
  useEffect(() => {
    if (!profileRow) return;
    setForm({
      name: profileRow.name || "",
      birthday: profileRow.birthday || "",
      country: profileRow.country || "",
      bio: profileRow.bio || "",
      avatar_url: profileRow.avatar_url || "",
      instagram_username: profileRow.instagram_username || "",
      instagram_followers: profileRow.instagram_followers || "",
      interests: profileRow.interests || [],
    });
    setAvatarPreview(profileRow.avatar_url || null);
    setRitualPushEnabled(profileRow.ritual_push_enabled ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileRow?.name, profileRow?.birthday, profileRow?.country, profileRow?.bio, profileRow?.avatar_url, profileRow?.instagram_username, profileRow?.instagram_followers, profileRow?.ritual_push_enabled]);

  const handleToggleRitualPush = async (checked: boolean) => {
    if (!user) return;
    setRitualPushEnabled(checked);
    const { error } = await supabase
      .from("profiles")
      .update({ ritual_push_enabled: checked } as any)
      .eq("user_id", user.id);
    if (error) {
      setRitualPushEnabled(!checked);
      toast.error(error.message);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = t('editProfile.errors.name');
    if (!form.birthday) newErrors.birthday = t('editProfile.errors.age');
    if (!form.country.trim()) newErrors.country = t('editProfile.errors.country');
    if (!form.bio.trim()) newErrors.bio = t('editProfile.errors.bio');
    // Profile photo is optional – a generated avatar is shown as fallback.
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setForm(prev => ({ ...prev, avatar_url: urlData.publicUrl }));
      setAvatarPreview(urlData.publicUrl);
      toast.success(t('editProfile.uploadSuccess'));
    } catch (err: any) {
      toast.error(err.message || t('editProfile.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!validate() || !user) return;

    setSaving(true);
    try {
      // Same calculation as the signup form (Auth.tsx) so age stays in sync
      // with the birthday the person actually picked, instead of a raw
      // number that goes stale every year.
      const birthDate = new Date(form.birthday);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;

      const profileData = {
        user_id: user.id,
        name: form.name.trim(),
        birthday: form.birthday,
        age: calculatedAge,
        country: form.country.trim(),
        bio: form.bio.trim(),
        avatar_url: form.avatar_url,
        instagram_username: form.instagram_username.trim() || null,
        instagram_followers: form.instagram_followers.trim() || null,
        interests: form.interests,
        updated_at: new Date().toISOString(),
      };

      // Check if profile exists
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let error;
      if (existing) {
        ({ error } = await supabase.from("profiles").update(profileData).eq("user_id", user.id));
      } else {
        ({ error } = await supabase.from("profiles").insert(profileData));
      }

      if (error) throw error;
      toast.success(t('editProfile.saveSuccess'));
      navigate("/profile");
    } catch (err: any) {
      toast.error(err.message || t('editProfile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "U")}&background=C8F14F&color=1E3323&size=400`;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[hsl(var(--blitz-forest))] flex items-center justify-center h-[70vh]">
          <p className="text-white/60">{t('editProfile.loading')}</p>
        </div>
      </Layout>
    );
  }

  const inputClass = "mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/40";

  return (
    <Layout>
      <div className="min-h-screen bg-[hsl(var(--blitz-forest))] text-white p-4 space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white text-xl font-bold">{t('editProfile.title')}</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-[hsl(var(--bolt))]">
              <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] flex items-center justify-center shadow-lg"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          {errors.avatar && <p className="text-red-400 text-xs">{errors.avatar}</p>}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <Label className="text-white/80 font-medium">{t('editProfile.name')} *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('editProfile.namePh')}
              className={inputClass}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="space-y-4">
            <div className="w-full overflow-hidden rounded-md">
              <Label className="text-white/80 font-medium">{t('auth.birthday')} *</Label>
              <Input
                type="date"
                value={form.birthday}
                onChange={(e) => setForm(prev => ({ ...prev, birthday: e.target.value }))}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 12)).toISOString().split('T')[0]}
                min="1900-01-01"
                className={`${inputClass} [color-scheme:dark] w-full max-w-full box-border`}
              />
              {errors.birthday && <p className="text-red-400 text-xs mt-1">{errors.birthday}</p>}
            </div>
            <div>
              <Label className="text-white/80 font-medium">{t('editProfile.country')} *</Label>
              <Select
                value={form.country || undefined}
                onValueChange={(v) => setForm(prev => ({ ...prev, country: v }))}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={t('editProfile.country')} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && <p className="text-red-400 text-xs mt-1">{errors.country}</p>}
            </div>
          </div>

          <div>
            <Label className="text-white/80 font-medium">{t('editProfile.aboutMe')} *</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder={t('editProfile.aboutMePh')}
              rows={3}
              className={`${inputClass} resize-none`}
            />
            {errors.bio && <p className="text-red-400 text-xs mt-1">{errors.bio}</p>}
          </div>

          <div>
            <Label className="text-white/80 font-medium">{t('editProfile.interestsLabel')}</Label>
            <p className="text-white/50 text-xs mt-0.5">{t('editProfile.interestsHint')}</p>
            <div className="flex gap-2 mt-2">
              <Input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = interestInput.trim();
                    if (v && !form.interests.includes(v) && form.interests.length < 12) {
                      setForm((p) => ({ ...p, interests: [...p.interests, v] }));
                      setInterestInput("");
                    }
                  }
                }}
                placeholder={t('editProfile.interestsPh')}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
              <Button
                type="button"
                onClick={() => {
                  const v = interestInput.trim();
                  if (v && !form.interests.includes(v) && form.interests.length < 12) {
                    setForm((p) => ({ ...p, interests: [...p.interests, v] }));
                    setInterestInput("");
                  }
                }}
                className="bg-white/15 hover:bg-white/25 text-white"
              >
                {t('editProfile.add')}
              </Button>
            </div>
            {form.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.interests.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, interests: p.interests.filter((t) => t !== tag) }))}
                    className="px-3 py-1.5 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] text-xs font-semibold flex items-center gap-1.5"
                  >
                    {tag} <span className="opacity-70">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/15 pt-4">
            <h3 className="text-white font-bold text-lg mb-3">{t('editProfile.instagramTitle')}</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-white/60 font-medium">{t('editProfile.username')}</Label>
                <Input
                  value={form.instagram_username}
                  onChange={(e) => setForm(prev => ({ ...prev, instagram_username: e.target.value }))}
                  placeholder={t('editProfile.usernamePh')}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-[hsl(var(--bolt))] hover:bg-[hsl(var(--bolt))]/90 text-[hsl(var(--blitz-forest))] font-bold text-lg"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {t('editProfile.save')}
        </Button>

        {/* Language */}
        <div className="border-t border-white/15 pt-6 mt-2 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-bold text-lg">{t('editProfile.language')}</h3>
            <p className="text-sm text-white/60">{t('editProfile.languageSub')}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Weekend ritual pushes */}
        <div className="border-t border-white/15 pt-6 mt-2 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-bold text-lg">Wochenend-Erinnerungen</h3>
            <p className="text-sm text-white/60">Fr/Sa/So ein kurzer Impuls, spontan was zu starten</p>
          </div>
          <Switch
            checked={ritualPushEnabled}
            onCheckedChange={handleToggleRitualPush}
            className="data-[state=checked]:bg-[hsl(var(--bolt))] data-[state=unchecked]:bg-white/25"
          />
        </div>

        {/* Password */}
        <div className="border-t border-white/15 pt-6 mt-2 space-y-3">
          <div>
            <h3 className="text-white font-bold text-lg">{t('editProfile.password')}</h3>
            <p className="text-sm text-white/60">{t('editProfile.passwordSub')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-white/80">{t('editProfile.newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword" className="text-white/80">{t('auth.confirmPassword')}</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmNewPassword}
            variant="outline"
            className="w-full h-11 rounded-xl font-bold border-white/25 text-white hover:bg-white/10 hover:text-white"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('editProfile.changePassword')}
          </Button>
        </div>

        <BlockedUsersList />

        {/* Danger zone */}
        <div className="border-t border-white/15 pt-6 mt-2">
          <h3 className="text-white font-bold text-lg mb-1">Konto</h3>
          <p className="text-sm text-white/60 mb-3">
            Wenn du dein Konto löschst, werden dein Profil, deine Nachrichten und
            deine Aktivitäten dauerhaft entfernt. Das kann nicht rückgängig
            gemacht werden.
          </p>
          <AlertDialog
            onOpenChange={(o) => {
              if (!o) setDeleteConfirm("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-400 font-bold"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Konto löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Konto endgültig löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion ist dauerhaft. Alle deine Daten (Profil,
                  Nachrichten, Blitz-Einträge) werden gelöscht. Tippe zur
                  Bestätigung <strong>LÖSCHEN</strong> ein.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="LÖSCHEN"
                autoFocus
              />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteAccount();
                  }}
                  disabled={deleting || deleteConfirm.trim().toUpperCase() !== "LÖSCHEN"}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Wird gelöscht…" : "Endgültig löschen"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-center text-xs text-white/50 pt-2">
          <a href="https://www.evendle.com/datenschutz.html" target="_blank" rel="noopener" className="hover:underline">Datenschutz</a>
          <span className="mx-1.5">·</span>
          <a href="https://www.evendle.com/agb.html" target="_blank" rel="noopener" className="hover:underline">AGB</a>
          <span className="mx-1.5">·</span>
          <a href="https://www.evendle.com/impressum.html" target="_blank" rel="noopener" className="hover:underline">Impressum</a>
        </p>
      </div>
    </Layout>
  );
};

export default EditProfile;
