## Problem

**1. Karussell-Klick-Konflikt:**
Wenn man auf eine seitliche Karte tippt, passiert Folgendes:
- `onSelect` feuert → `flyTo` startet auf der Karte
- Die Karten-Bewegung löst `moveend` aus → `viewportBounds` ändert sich → `carouselEvents` werden neu berechnet → Reihenfolge ändert sich → das Karussell „springt" zu einem anderen Event
- Außerdem wird beim Scrollen mit 140 ms Debounce ein `onSelect` ausgelöst, das mit dem neuen Viewport kollidiert

**2. Mein Standort:**
Aktuell triggert nur ein Button die Geolocation. Es gibt zwar einen blauen Punkt von Mapbox (über `GeolocateControl`), aber er erscheint erst nach Tap. Der User möchte ihn dauerhaft sehen.

## Lösung

### A) Karussell stabilisieren (`src/pages/Nearby.tsx`)

1. **Karussell-Snapshot einfrieren während Interaktion:** Statt `carouselEvents` bei jeder Viewport-Änderung neu zu berechnen, einen „Lock"-Mechanismus einbauen:
   - Wenn der User gerade durchs Karussell scrollt **oder** das Karussell gerade einen `flyTo` ausgelöst hat (z. B. 800 ms Cooldown), wird `viewportBounds` nicht mehr in `carouselEvents` reingerechnet.
   - Dadurch bleibt die Karten-Reihenfolge stabil, während die Map fliegt.

2. **`isCarouselDriving` Flag:** Nach `handleCarouselSelect` für ~900 ms setzen, in dieser Zeit ignoriert das `useMemo` neue Bounds.

3. **Tap auf Seitenkarte = nur selektieren, kein Expand:**
   - Aktuell ruft das Karussell `onExpand` nur wenn `isCenter`. Das passt — aber die Klicks gehen verloren, weil der Snap-Scroll schon den `activeIdx` verändert. → In `EventCarousel.tsx` sicherstellen, dass `pointer-events` auf allen Karten aktiv sind und der Klick nicht vom Snap-Scroll geschluckt wird. Außerdem `onSelect` direkt aufrufen, ohne auf Debounce zu warten, wenn explizit getippt wurde.

### B) Eigener Standort als blauer Punkt (`src/components/MapboxMap.tsx`)

1. **Geolocation beim Map-Load automatisch triggern**, sobald die Map fertig ist (nicht erst auf Button-Klick warten):
   ```tsx
   map.current.on('load', () => {
     setIsLoaded(true);
     // Standort einmal automatisch abfragen, ohne die Map zu zentrieren
     setTimeout(() => geolocateRef.current?.trigger(), 500);
   });
   ```
2. Mapbox' `GeolocateControl` mit `trackUserLocation: true` zeigt dann den klassischen blauen Punkt (mit Genauigkeitskreis und Heading-Cone) dauerhaft an.
3. Der vorhandene `LocateFixed`-Button bleibt zum erneuten Zentrieren.
4. CSS in `src/index.css` prüfen: Der versteckte Mapbox-Control darf den blauen Punkt **nicht** mit ausblenden — nur die Button-UI verstecken, nicht den `user-location-dot`-Layer (ist eh schon korrekt, nur sicherstellen).

### Geänderte Dateien

- `src/pages/Nearby.tsx` — Lock-Flag für Karussell-Reihenfolge während `flyTo`
- `src/components/EventCarousel.tsx` — Klick-Handling auf Seitenkarten robust machen
- `src/components/MapboxMap.tsx` — Geolocation beim Load automatisch starten

## Rückfrage

Soll der blaue Standort-Punkt **automatisch beim Öffnen** der Karte erscheinen (= einmalige Berechtigungs-Abfrage des Browsers beim ersten Mal)? Falls du lieber willst, dass der User erst aktiv tippen muss, sag Bescheid — dann lasse ich das Auto-Trigger weg.
