/**
 * Returns a Tailwind font-size class so that the activity text inside a Blitz
 * card always fits without being clipped, no matter how long the input is.
 */
export function getActivityFontClass(text: string | null | undefined): string {
  const len = (text ?? "").length;
  if (len <= 12) return "text-6xl";
  if (len <= 20) return "text-5xl";
  if (len <= 32) return "text-4xl";
  if (len <= 48) return "text-3xl";
  if (len <= 80) return "text-2xl";
  return "text-xl";
}
