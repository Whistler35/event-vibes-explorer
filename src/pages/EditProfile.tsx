import { useEffect, useState, useRef } from "react";
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
import LanguageSwitcher from "@/components/LanguageSwitcher";

const EditProfile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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
    age: "",
    country: "",
    bio: "",
    fun_fact: "",
    avatar_url: "",
    instagram_username: "",
    instagram_followers: "",
    interests: [] as string[],
  });
  const [interestInput, setInterestInput] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, age, country, bio, fun_fact, avatar_url, instagram_username, instagram_followers, interests")
        .eq("user_id", user.id)
        .maybeSingle() as any;

      if (data) {
        setForm({
          name: data.name || "",
          age: data.age?.toString() || "",
          country: data.country || "",
          bio: data.bio || "",
          fun_fact: data.fun_fact || "",
          avatar_url: data.avatar_url || "",
          instagram_username: data.instagram_username || "",
          instagram_followers: data.instagram_followers || "",
          interests: data.interests || [],
        });
        setAvatarPreview(data.avatar_url);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = t('editProfile.errors.name');
    if (!form.age.trim() || isNaN(Number(form.age)) || Number(form.age) < 1) newErrors.age = t('editProfile.errors.age');
    if (!form.country.trim()) newErrors.country = t('editProfile.errors.country');
    if (!form.bio.trim()) newErrors.bio = t('editProfile.errors.bio');
    if (!form.fun_fact.trim()) newErrors.fun_fact = t('editProfile.errors.fun_fact');
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
      const profileData = {
        user_id: user.id,
        name: form.name.trim(),
        age: Number(form.age),
        country: form.country.trim(),
        bio: form.bio.trim(),
        fun_fact: form.fun_fact.trim(),
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

  const currentAvatar = avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "U")}&background=ff5722&color=fff&size=400`;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <p className="text-muted-foreground">{t('editProfile.loading')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-foreground text-xl font-bold">{t('editProfile.title')}</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary">
              <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          {errors.avatar && <p className="text-destructive text-xs">{errors.avatar}</p>}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <Label className="text-foreground font-medium">{t('editProfile.name')} *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('editProfile.namePh')}
              className="mt-1 bg-muted border-border text-foreground"
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground font-medium">{t('editProfile.age')} *</Label>
              <Input
                type="number"
                value={form.age}
                onChange={(e) => setForm(prev => ({ ...prev, age: e.target.value }))}
                placeholder="25"
                min={1}
                className="mt-1 bg-muted border-border text-foreground"
              />
              {errors.age && <p className="text-destructive text-xs mt-1">{errors.age}</p>}
            </div>
            <div>
              <Label className="text-foreground font-medium">{t('editProfile.country')} *</Label>
              <Select
                value={form.country || undefined}
                onValueChange={(v) => setForm(prev => ({ ...prev, country: v }))}
              >
                <SelectTrigger className="mt-1 bg-muted border-border text-foreground">
                  <SelectValue placeholder={t('editProfile.country')} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && <p className="text-destructive text-xs mt-1">{errors.country}</p>}
            </div>
          </div>

          <div>
            <Label className="text-foreground font-medium">{t('editProfile.aboutMe')} *</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder={t('editProfile.aboutMePh')}
              rows={3}
              className="mt-1 bg-muted border-border text-foreground resize-none"
            />
            {errors.bio && <p className="text-destructive text-xs mt-1">{errors.bio}</p>}
          </div>

          <div>
            <Label className="text-foreground font-medium">{t('editProfile.funFact')} *</Label>
            <Input
              value={form.fun_fact}
              onChange={(e) => setForm(prev => ({ ...prev, fun_fact: e.target.value }))}
              placeholder={t('editProfile.funFactPh')}
              className="mt-1 bg-muted border-border text-foreground"
            />
            {errors.fun_fact && <p className="text-destructive text-xs mt-1">{errors.fun_fact}</p>}
          </div>

          <div>
            <Label className="text-foreground font-medium">{t('editProfile.interestsLabel')}</Label>
            <p className="text-muted-foreground text-xs mt-0.5">{t('editProfile.interestsHint')}</p>
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
                className="bg-muted border-border text-foreground"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const v = interestInput.trim();
                  if (v && !form.interests.includes(v) && form.interests.length < 12) {
                    setForm((p) => ({ ...p, interests: [...p.interests, v] }));
                    setInterestInput("");
                  }
                }}
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
                    className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5"
                  >
                    {tag} <span className="opacity-70">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-foreground font-bold text-lg mb-3">{t('editProfile.instagramTitle')}</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground font-medium">{t('editProfile.username')}</Label>
                <Input
                  value={form.instagram_username}
                  onChange={(e) => setForm(prev => ({ ...prev, instagram_username: e.target.value }))}
                  placeholder={t('editProfile.usernamePh')}
                  className="mt-1 bg-muted border-border text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground font-medium">{t('editProfile.followers')}</Label>
                <Input
                  value={form.instagram_followers}
                  onChange={(e) => setForm(prev => ({ ...prev, instagram_followers: e.target.value }))}
                  placeholder={t('editProfile.followersPh')}
                  className="mt-1 bg-muted border-border text-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {t('editProfile.save')}
        </Button>

        {/* Language */}
        <div className="border-t border-border pt-6 mt-2 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-foreground font-bold text-lg">{t('editProfile.language')}</h3>
            <p className="text-sm text-muted-foreground">{t('editProfile.languageSub')}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Password */}
        <div className="border-t border-border pt-6 mt-2 space-y-3">
          <div>
            <h3 className="text-foreground font-bold text-lg">{t('editProfile.password')}</h3>
            <p className="text-sm text-muted-foreground">{t('editProfile.passwordSub')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-foreground">{t('editProfile.newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword" className="text-foreground">{t('auth.confirmPassword')}</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="bg-muted border-border text-foreground"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmNewPassword}
            variant="outline"
            className="w-full h-11 rounded-xl font-bold"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('editProfile.changePassword')}
          </Button>
        </div>

        {/* Danger zone */}
        <div className="border-t border-border pt-6 mt-2">
          <h3 className="text-foreground font-bold text-lg mb-1">Konto</h3>
          <p className="text-sm text-muted-foreground mb-3">
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
                className="w-full h-12 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-bold"
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
                className="bg-muted border-border text-foreground"
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

        <p className="text-center text-xs text-muted-foreground pt-2">
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
