export interface GeoPlace {
  /** Short, human label (e.g. "Innsbruck, Tirol"). */
  label: string;
  lat: number;
  lng: number;
}

/**
 * Looks up a place name via OpenStreetMap's Nominatim. Free and keyless, but
 * its usage policy allows ~1 request/second, so call this on an explicit
 * search action (button/Enter), never on every keystroke.
 */
export async function searchPlaces(query: string, lang = "de"): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=0" +
    `&accept-language=${encodeURIComponent(lang)}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const rows = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return rows
    .map((r) => ({
      label: r.display_name.split(",").slice(0, 2).map((p) => p.trim()).join(", "),
      lat: Number(r.lat),
      lng: Number(r.lon),
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}
