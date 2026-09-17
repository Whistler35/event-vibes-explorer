import { supabase } from "@/integrations/supabase/client";

/**
 * Deletes a photo from the shared public "avatars" bucket given its public
 * URL (as stored in photo_url columns) — best-effort, never throws, so a
 * storage hiccup never blocks the row delete the photo belongs to.
 */
export async function deleteStoragePhoto(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const marker = "/storage/v1/object/public/avatars/";
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length));
  try {
    await supabase.storage.from("avatars").remove([path]);
  } catch {
    // best-effort cleanup only
  }
}
