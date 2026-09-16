import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

/**
 * Share a link, with visible feedback on every path. Never silently no-ops:
 * that's exactly what made "Invite more friends" look unresponsive on iPad
 * (bare navigator.share() call, failure swallowed in an empty catch — Web
 * Share isn't reliably available inside a Capacitor WKWebView).
 */
export async function shareInvite(opts: { title: string; text: string; url: string; copiedMessage: string }) {
  const { title, text, url, copiedMessage } = opts;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title, text, url, dialogTitle: title });
      return;
    } catch (err: any) {
      // User dismissing the native share sheet also lands here — that's not
      // an error, so fall through to clipboard only for real failures.
      if (err?.message?.toLowerCase?.().includes("cancel")) return;
    }
  } else if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err: any) {
      if (err?.name === "AbortError") return; // user cancelled
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success(copiedMessage);
  } catch {
    toast.error(url);
  }
}
