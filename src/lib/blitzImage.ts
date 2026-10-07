import { supabase } from "@/integrations/supabase/client";

const MAX_DIMENSION = 1280;

/**
 * Downscales a picked photo before upload — full-resolution phone photos are
 * several MB, which is slow on mobile data and wasteful for a card image.
 * Falls back to the original file if the browser can't decode/encode it.
 */
async function downscale(file: File, maxDim: number, quality: number): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file;
  }
}

async function uploadToAvatarsBucket(userId: string, folder: string, file: File, maxDim: number): Promise<string> {
  const blob = await downscale(file, maxDim, 0.85);
  const isJpeg = blob !== file;
  const ext = isJpeg ? "jpg" : file.name.split(".").pop() || "jpg";
  const path = `${userId}/${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: isJpeg ? "image/jpeg" : file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

/** Picture on the back of a Blitz card. Uses the shared public "avatars" bucket. */
export function uploadBlitzImage(userId: string, file: File): Promise<string> {
  return uploadToAvatarsBucket(userId, "blitz", file, MAX_DIMENSION);
}

/** Logo/profile picture for an admin's "Freifeld" Blitz identity. */
export function uploadBlitzLogo(userId: string, file: File): Promise<string> {
  return uploadToAvatarsBucket(userId, "blitz-logo", file, 512);
}
