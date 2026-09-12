import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Blitz activity headlines are shown as a question ("Kaffee?") — don't double
 *  up the "?" when the user already typed one themselves. */
export function asBlitzQuestion(activity: string) {
  return activity.trim().endsWith("?") ? activity.trim() : `${activity}?`;
}

export function getInstagramUrl(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (!url.hostname.includes("instagram.com")) return null;

      const cleanedPath = url.pathname
        .split("/")
        .filter(Boolean)
        .slice(0, 1)
        .join("/");

      return cleanedPath ? `https://www.instagram.com/${cleanedPath}/` : "https://www.instagram.com/";
    } catch {
      return null;
    }
  }

  const cleanedUsername = trimmed
    .replace(/^@/, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^www\.instagram\.com\//i, "")
    .replace(/^https?:\/\/www\.instagram\.com\//i, "")
    .replace(/^https?:\/\/instagram\.com\//i, "")
    .split("/")
    .filter(Boolean)[0]
    ?.replace(/[^a-zA-Z0-9._]/g, "");

  return cleanedUsername ? `https://www.instagram.com/${cleanedUsername}/` : null;
}
