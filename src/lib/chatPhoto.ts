import { supabase } from "@/integrations/supabase/client";

/** Uploads a chat photo to the shared public "avatars" bucket and returns its public URL. */
export async function uploadChatPhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/chat/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

/** Placeholder text stored on a photo-only message so previews/notifications show something sensible. */
export const PHOTO_PLACEHOLDER = "📷 Foto";
