// Bottom sheets are lifted above the keyboard by --keyboard-height (see
// sheet.tsx / useKeyboardOpen), so a plain h-[80vh] / max-h-[75vh] can end up
// taller than the space actually left above the keyboard and poke out of the
// top of the screen. These cap the height at "normal cap OR what's left".
// (Full literal strings so Tailwind's scanner picks them up.)
export const SHEET_MAX_H_75 =
  "max-h-[min(75vh,calc(100dvh_-_var(--keyboard-height,0px)_-_env(safe-area-inset-top,0px)_-_0.5rem))]";
export const SHEET_MAX_H_80 =
  "max-h-[min(80vh,calc(100dvh_-_var(--keyboard-height,0px)_-_env(safe-area-inset-top,0px)_-_0.5rem))]";
export const SHEET_MAX_H_88 =
  "max-h-[min(88vh,calc(100dvh_-_var(--keyboard-height,0px)_-_env(safe-area-inset-top,0px)_-_0.5rem))]";
