## Ziel
Wenn aktuell keine Events im sichtbaren Kartenausschnitt liegen, soll das Karussell unten trotzdem die **3 nächstgelegenen Events** (gemessen am aktuellen Kartenzentrum) anzeigen, statt leer zu bleiben.

## Änderung
Datei: `src/pages/Nearby.tsx` — `carouselEvents` useMemo (Zeilen ~410-433)

Logik:
1. Wie bisher `inView` aus `mapEvents` per Viewport-Bounds filtern.
2. **Neu:** Wenn `inView.length === 0` und `mapEvents.length > 0`:
   - Referenzpunkt = Mittelpunkt von `effectiveBounds` (sonst aktueller Map-Center / `mapCenter`).
   - Alle `mapEvents` per Haversine-Distanz zum Referenzpunkt sortieren.
   - Die nächsten **3** als Fallback-Liste zurückgeben (Featured-Sortierung in diesem Fallback ignorieren — Distanz hat Vorrang).
3. Sonst: bisherige Featured-first + Datums-Sortierung, max 10.

## Technische Details
- Haversine-Helfer ist bereits im Projekt vorhanden (Memory: "Nearby Ranking"). Verwenden oder kleine lokale Funktion ergänzen.
- Bestehende Filter (Kategorien, Datum, `popular`, `isPrivateMode`) bleiben unverändert — der Fallback arbeitet auf dem bereits gefilterten `mapEvents`, also respektiert er die aktiven Filter.
- Auto-Select des ersten Karussell-Items funktioniert unverändert.
- Karten-Marker bleiben unverändert; nur das Karussell bekommt den Fallback.

## Edge Cases
- `mapEvents` leer → Karussell bleibt leer (wie heute).
- Weniger als 3 vorhandene Events insgesamt → es werden so viele angezeigt wie da sind.
- Fallback-Events können außerhalb des sichtbaren Bereichs liegen — das ist gewollt.