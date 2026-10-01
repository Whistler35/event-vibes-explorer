import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/** Tracks whether the on-screen keyboard is currently open, via Capacitor's
 * Keyboard plugin events (native only — there's no equivalent signal on web).
 * Also mirrors the keyboard's height onto a --keyboard-height CSS variable on
 * <html>, so position:fixed elements (e.g. bottom sheets — see sheet.tsx) can
 * lift themselves above the keyboard with `bottom: var(--keyboard-height)`
 * instead of needing position:absolute (which breaks on any page that's
 * itself scrolled, since absolute is document-relative, not viewport-relative
 * like fixed is). */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeShow: (() => void) | undefined;
    let removeHide: (() => void) | undefined;
    import("@capacitor/keyboard").then(({ Keyboard }) => {
      Keyboard.addListener("keyboardWillShow", (info) => {
        setOpen(true);
        document.documentElement.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
      }).then((h) => {
        removeShow = () => h.remove();
      });
      Keyboard.addListener("keyboardWillHide", () => {
        setOpen(false);
        document.documentElement.style.setProperty("--keyboard-height", "0px");
      }).then((h) => {
        removeHide = () => h.remove();
      });
    });
    return () => {
      removeShow?.();
      removeHide?.();
    };
  }, []);

  return open;
}
