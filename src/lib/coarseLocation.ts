/**
 * Blitz coordinates are readable by other users' devices (they use them to
 * decide whether a Blitz is within range), so we never store an exact GPS fix
 * for them. Snapping to a ~0.005° grid (≈ 550 m north–south) keeps the radius
 * check meaningful while making it impossible to read someone's exact spot.
 */
const GRID_DEGREES = 0.005;

export function coarsenCoordinate(value: number): number {
  if (!Number.isFinite(value) || value === 0) return value;
  return Number((Math.round(value / GRID_DEGREES) * GRID_DEGREES).toFixed(4));
}

export function coarsenCoords(c: { lat: number; lng: number }): { lat: number; lng: number } {
  return { lat: coarsenCoordinate(c.lat), lng: coarsenCoordinate(c.lng) };
}
