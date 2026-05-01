import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    age: "",
    country: "",
    bio: "",
    fun_fact: "",
    avatar_url: "",
    instagram_username: "",
    instagram_followers: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, age, country, bio, fun_fact, avatar_url, instagram_username, instagram_followers")
        .eq("user_id", user.id)
        .maybeSingle();

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
        });
        setAvatarPreview(data.avatar_url);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.age.trim() || isNaN(Number(form.age)) || Number(form.age) < 1) newErrors.age = "Enter a valid age";
    if (!form.country.trim()) newErrors.country = "Country is required";
    if (!form.bio.trim()) newErrors.bio = "Short bio is required";
    if (!form.fun_fact.trim()) newErrors.fun_fact = "Fun fact is required";
    if (!avatarPreview && !form.avatar_url) newErrors.avatar = "Profile picture is required";
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
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
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
      toast.success("Profile saved!");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "U")}&background=ff5722&color=fff&size=400`;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <p className="text-muted-foreground">Loading...</p>
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
          <h1 className="text-foreground text-xl font-bold">Edit profile</h1>
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
            <Label className="text-foreground font-medium">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Your name"
              className="mt-1 bg-muted border-border text-foreground"
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground font-medium">Age *</Label>
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
              <Label className="text-foreground font-medium">Country *</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm(prev => ({ ...prev, country: e.target.value }))}
                placeholder="🇩🇪"
                className="mt-1 bg-muted border-border text-foreground"
              />
              {errors.country && <p className="text-destructive text-xs mt-1">{errors.country}</p>}
            </div>
          </div>

          <div>
            <Label className="text-foreground font-medium">About me *</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell something about yourself..."
              rows={3}
              className="mt-1 bg-muted border-border text-foreground resize-none"
            />
            {errors.bio && <p className="text-destructive text-xs mt-1">{errors.bio}</p>}
          </div>

          <div>
            <Label className="text-foreground font-medium">Fun Fact *</Label>
            <Input
              value={form.fun_fact}
              onChange={(e) => setForm(prev => ({ ...prev, fun_fact: e.target.value }))}
              placeholder="Something fun about you"
              className="mt-1 bg-muted border-border text-foreground"
            />
            {errors.fun_fact && <p className="text-destructive text-xs mt-1">{errors.fun_fact}</p>}
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-foreground font-bold text-lg mb-3">Instagram (optional)</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground font-medium">Username</Label>
                <Input
                  value={form.instagram_username}
                  onChange={(e) => setForm(prev => ({ ...prev, instagram_username: e.target.value }))}
                  placeholder="@your_username"
                  className="mt-1 bg-muted border-border text-foreground"
                />
              </div>
              <div>
                <Label className="text-muted-foreground font-medium">Followers</Label>
                <Input
                  value={form.instagram_followers}
                  onChange={(e) => setForm(prev => ({ ...prev, instagram_followers: e.target.value }))}
                  placeholder="e.g. 1.2k"
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
          Save profile
        </Button>
      </div>
    </Layout>
  );
};

export default EditProfile;
