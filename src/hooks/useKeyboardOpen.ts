import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/** Tracks whether the on-screen keyboard is currently open, via Capacitor's
 * Keyboard plugin events (native only — there's no equivalent signal on web). */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeShow: (() => void) | undefined;
    let removeHide: (() => void) | undefined;
    import("@capacitor/keyboard").then(({ Keyboard }) => {
      Keyboard.addListener("keyboardWillShow", () => setOpen(true)).then((h) => {
        removeShow = () => h.remove();
      });
      Keyboard.addListener("keyboardWillHide", () => setOpen(false)).then((h) => {
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
