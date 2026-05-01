# Nearby: Map-Sync, Filter, Suche

Drei klar abgegrenzte Verbesserungen auf `/nearby`. Marken/Farben bleiben (Forest + Citrus/Lime), kein neues Lib.

---

## 1) Karte ↔ Karusell – ruhiger Flow

**Problem:** Beim Zoomen/Panen ändert sich `viewportBounds` ständig → Karusell-Liste wird neu gefiltert → aktiver Index springt → `flyTo` feuert → wieder neue Bounds → Endlos-Schaukel.

**Lösungen (in `src/pages/Nearby.tsx` + `EventCarousel.tsx`):**

- **Map-Bewegung debouncen**: `viewportBounds` erst nach 250 ms Ruhe in `MapboxMap` emittieren (im `moveend`-Handler `setTimeout` + `clearTimeout`). Dadurch keine Bounds-Updates während aktivem Pan.
- **Origin-Tracking statt Lock-Timer**: Statt `lockedBounds`+1.2 s Timer einen Ref `lastInteractionOriginRef` einführen mit Werten `'user'` | `'carousel'`. Wird das Karusell zur Quelle einer `flyTo`-Bewegung, ignoriert die Page **alle** Bounds-Änderungen, bis die Map einen `moveend` ohne weitere Folgebewegung hatte (≥ 1 Animationszyklus). Erst dann wieder `viewportBounds` = aktuelle Bounds.
- **Karusell-Liste stabilisieren**: Memo-Key inkl. `selectedEventId`, sodass das gerade ausgewählte Event **immer** in der Liste bleibt, auch wenn es kurz aus den Bounds rutscht. → keine „Karte verschwindet beim Tap"-Race mehr.
- **Tap auf Side-Card**: 
  - `onClick`: sofort `setActiveIdx(i)`, scrollen ins Zentrum, `onSelect(ev)` → `flyTo`.
  - Während des `scrollTo` den `onScroll`-Debounce-Select unterdrücken (Flag `programmaticScrollRef`), damit nicht parallel ein zweites Select feuert.
- **Klick auf Center-Card** öffnet weiterhin Detail-Sheet (`onExpand`).
- **`flyTo` weicher**: nur panen, **nicht zoomen** (Zoom nur beibehalten). Dauer 700 ms, `essential: true`.

Resultat: Beim Reinzoomen bleibt das Karusell stehen. Swipen pannt die Karte sanft. Side-Card-Tap funktioniert beim ersten Versuch.

---

## 2) Filter-Dropdown nicht mehr abgeschnitten

**Problem (Screenshot):** `CategoryFilter`-Popover öffnet `absolute left-0` und ragt rechts aus dem Viewport.

**Fix in `src/components/CategoryFilter.tsx`:**
- Popover-Positionierung: `right-0` statt `left-0`, plus `max-w-[calc(100vw-1.5rem)]`, Breite auf `w-[18rem]` mit `min(18rem, calc(100vw - 1.5rem))`.
- Z-Index auf `z-[60]` (über Quick-Pills und Karusell-Top).
- Sicherheits-Padding `mr-2` damit Schatten nicht beschnitten wirkt.

---

## 3) Globale Suche (Events + Orte)

**Aktuell:** Suchleiste fragt nur Mapbox-Geocoding (Städte/Orte) ab. Events sind nicht findbar.

**Neuer Flow in `src/pages/Nearby.tsx`:**
- Bei Input-Länge ≥ 2 **parallel** zwei Quellen abfragen:
  1. **Events** (Supabase): 
     ```ts
     supabase.from('events')
       .select('id,title,category,event_date,location_name,latitude,longitude,image_url,is_featured')
       .eq('visibility', 'public')
       .eq('status', 'approved')
       .or(`title.ilike.%${q}%,description.ilike.%${q}%,location_name.ilike.%${q}%`)
       .order('event_date', { ascending: true })
       .limit(6);
     ```
  2. **Orte** (Mapbox Geocoding, wie bisher), Limit 4.
- Suggestions-Dropdown bekommt zwei Sektionen mit Headern „Events" und „Orte":
  - Event-Eintrag: kleines Bild/Icon nach Kategorie, Titel, Datum + Ort (klein, muted), `Top`-Badge wenn `is_featured`.
  - Ort-Eintrag: `MapPin`-Icon + Name (wie heute).
- Klick auf **Event** → `mapRef.current.flyTo(lat, lng, 16)` + `setSelectedEvent(event)` (öffnet `EventDetailSheet`) + Suggestions schließen, Suchfeld auf Event-Titel setzen.
- Klick auf **Ort** → bestehender `selectCity`-Flow.
- Loading-State: kleiner Spinner rechts im Suchfeld während Debounce-Fetch.
- Empty-State: „Keine Events oder Orte gefunden" wenn beide Listen leer.

**Code-Struktur:**
- Neuer Hook **nicht nötig** — kompakt direkt im Page-Component mit `useState`/`useEffect` + Debounce (300 ms, ein gemeinsamer `AbortController` für beide Requests).
- Type für gemischte Suggestions:
  ```ts
  type Suggestion =
    | { kind: 'event'; event: SearchEvent }
    | { kind: 'place'; place: GeoResult };
  ```

---

## Geänderte Dateien

- `src/pages/Nearby.tsx` — Suchfunktion (Events + Orte), Origin-Tracking statt Lock-Timer, stabile Carousel-Liste
- `src/components/EventCarousel.tsx` — Programmatic-Scroll-Flag, Side-Card-Tap härten
- `src/components/MapboxMap.tsx` — Debounce des Viewport-Emits
- `src/components/CategoryFilter.tsx` — Popover rechts ausrichten + Viewport-Clamp

Keine DB-, RLS- oder Edge-Function-Änderungen nötig (Events-Query nutzt bestehende Spalten und Policies).
