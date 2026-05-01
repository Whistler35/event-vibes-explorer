
# Karussell-Reihenfolge stabil halten beim Wischen

## Problem

Wenn der User auf der Karte (`/nearby`) durch das Karussell wischt:
1. Jeder Swipe triggert `flyTo` → die Karte springt zum Event (cool, soll bleiben)
2. Nach dem Flug (ca. 1100ms) tauen die `viewportBounds` wieder auf
3. Die `carouselEvents`-Liste filtert sich auf neue Bounds → **Reihenfolge ändert sich, Karten verschwinden, neue tauchen auf**
4. Das fühlt sich unruhig an — man verliert die Übersicht über die Karten, durch die man gerade wischt

## Lösung

Die Karussell-Liste soll während einer aktiven "Wisch-Session" **eingefroren** bleiben. Die Liste wird nur dann neu berechnet, wenn:
- Filter sich ändern (Kategorie, Datum, Quick-Pills, Privatmodus)
- Der User die Karte aktiv neu positioniert (Pan/Zoom, ohne dass das Karussell ihn dorthin geflogen hat)
- Das Karussell sich für eine Zeit "beruhigt" hat (kein Swipe mehr)

Das Verhalten "Map fliegt zum gewischten Event" bleibt 1:1 erhalten.

## Vorgehen

In `src/pages/Nearby.tsx`:

1. **Eingefrorenen Snapshot speichern**: Neuer State `frozenCarousel: MapEvent[] | null`. Solange gesetzt, wird er statt der berechneten Liste angezeigt.

2. **Beim ersten Carousel-Swipe einfrieren**: In `handleCarouselSelect` einmalig die aktuelle `carouselEvents`-Liste als Snapshot speichern. Folge-Swipes lassen den Snapshot unverändert — der User wischt durch die identische Karten-Reihenfolge.

3. **Sinnvolles Auftauen**:
   - Wenn der User die Karte selbst bewegt (Pan/Zoom ohne `carouselDrivingRef`) → Snapshot leeren, Liste neu berechnen.
   - Wenn Filter, Kategorie, Datum, Privatmodus, Stadt-Auswahl ändern → Snapshot leeren (via `useEffect` auf diese Deps).
   - Wenn ein Marker direkt auf der Karte angetippt wird → Snapshot leeren, damit das angetippte Event sicher in der frischen Liste landet.

4. **Carousel verwendet den Snapshot**: `<EventCarousel events={frozenCarousel ?? carouselEvents} />`. Das stellt sicher, dass `EventCarousel`s interne Sync-Logik (Index ↔ selectedId) auf einer stabilen Liste arbeitet und nicht plötzlich umspringt.

5. **Auto-Select-Effekt anpassen**: Der bestehende Effect, der `selectedEventId` auf das erste Element setzt, soll auf der angezeigten Liste (Snapshot wenn vorhanden) basieren, nicht auf der Live-Liste — sonst wechselt die Auswahl trotz Freeze.

## Technische Details

- Neuer State: `const [frozenCarousel, setFrozenCarousel] = useState<MapEvent[] | null>(null);`
- In `handleCarouselSelect`: `if (!frozenCarousel) setFrozenCarousel(carouselEvents);`
- In `onViewportChange`-Callback: zusätzlich zum bestehenden Guard auch `setFrozenCarousel(null)` aufrufen, **wenn die Bounds-Änderung NICHT vom Karussell stammt** (also wenn `!carouselDrivingRef.current`). Damit taut User-Interaktion mit der Karte den Freeze auf.
- In `onEventClick` (Marker-Tap): `setFrozenCarousel(null)` damit die Liste sich frisch um den getippten Marker bildet.
- `useEffect` mit Deps `[selectedCategories, dateFilter?.from, dateFilter?.to, isPrivateMode, activeQuickFilters]` → `setFrozenCarousel(null)`.
- `displayedCarouselEvents = frozenCarousel ?? carouselEvents` an `EventCarousel` und an den Auto-Select-Effekt übergeben.

## Was unverändert bleibt

- Map-Sprung beim Swipe (`flyTo`)
- Carousel-Layout, Animationen, Marker-Verhalten
- Datenquellen, Filter, RLS
- Keine DB-Migrationen
