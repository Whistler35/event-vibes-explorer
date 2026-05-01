import { useRef, useState } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  photos: string[];
  editable?: boolean;
  onChange?: (photos: string[]) => void;
}

const PhotoStrip = ({ userId, photos, editable = false, onChange }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/gallery/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const next = [...photos, data.publicUrl];
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ photos: next })
        .eq("user_id", userId);
      if (upErr) throw upErr;
      onChange?.(next);
      toast.success("Foto hinzugefügt");
    } catch (err: any) {
      toast.error(err.message || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async (url: string) => {
    const next = photos.filter((p) => p !== url);
    const { error } = await supabase.from("profiles").update({ photos: next }).eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange?.(next);
  };

  return (
    <>
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 -mx-4 pb-1">
        {photos.map((url) => (
          <div key={url} className="relative shrink-0">
            <button
              onClick={() => setPreview(url)}
              className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/15"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
            {editable && (
              <button
                onClick={() => removePhoto(url)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                aria-label="Foto entfernen"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {editable && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-16 h-16 shrink-0 rounded-2xl border-2 border-dashed border-white/30 text-white/70 flex items-center justify-center hover:border-[hsl(var(--blitz-pink))] hover:text-[hsl(var(--blitz-pink))] transition"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
        >
          <img src={preview} alt="" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}
    </>
  );
};

export default PhotoStrip;
