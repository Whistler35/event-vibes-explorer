## Problem

Der "Free"-Quick-Filter auf der Karte (Nearby) ist aktuell nur eine UI-Pille ohne Logik. Events haben kein Preisfeld, daher kann der Filter nichts filtern. Das Feature ist also broken.

## Ziel

Events bekommen einen optionalen Preis. Der "Free"-Filter zeigt dann nur kostenlose Events. Im Event-Detail und auf den Karten wird der Preis (bzw. "Free") sichtbar gemacht.

## Lösungsweg

### 1. Datenbank
- Spalte `price_cents integer NOT NULL DEFAULT 0` zur `events`-Tabelle hinzufügen.
- `0` bedeutet kostenlos, alles andere = kostenpflichtig.
- Optional: Spalte `currency text DEFAULT 'EUR'` (für später, fix EUR fürs MVP).
- Bestehende Events bleiben automatisch "Free" (Default 0).

### 2. Event-Erstellung (CreateEventDialog)
- Neues Feld "Price (EUR)" — Number-Input, optional, leer = Free.
- Anzeige als "Free" wenn 0 oder leer.
- Speicherung in Cents (`Math.round(price * 100)`).

### 3. Event-Bearbeitung (EditEventDialog)
- Gleiches Feld zum Bearbeiten.

### 4. Event-Anzeige
- **EventDetail-Seite**: Preis prominent neben Datum/Location anzeigen ("Free" oder "€X,XX").
- **EventCard / EventDetailSheet**: kleines Badge "Free" oder Preis.
- **Map-Marker**: optional ein kleines "€"-Indikator-Badge bei kostenpflichtigen Events (kann aber auch in Phase 2).

### 5. Filter-Logik (Nearby)
- Im `useSearchEvents`-Hook neuen Parameter `free_only?: boolean` ergänzen.
- In der Edge-Function `search-events`: bei `free_only=true` → `price_cents = 0` filtern.
- In `Nearby.tsx`: `activeQuickFilters.has('free')` an den Hook durchreichen.

### 6. Texte
- Englisch: "Price", "Free", "€X.XX".
- Im EventCard das bestehende Layout nicht aufblähen — kleines Pill rechts oben oder neben der Kategorie.

## Nicht Teil dieses Plans
- Echte Bezahlung / Stripe-Tickets für User-Events (aktuell nur Anzeige des Preises).
- Währungswechsel (alles EUR fürs MVP).
- Pay-walls oder Ticketkauf-Flow.

## Technische Details

**Migration:**
```sql
ALTER TABLE public.events
  ADD COLUMN price_cents integer NOT NULL DEFAULT 0;
```

**Geänderte Dateien:**
- `supabase/migrations/<new>.sql` (Spalte hinzufügen)
- `src/components/CreateEventDialog.tsx` (neues Feld + Insert)
- `src/components/EditEventDialog.tsx` (neues Feld + Update)
- `src/pages/EventDetail.tsx` (Preisanzeige)
- `src/components/EventCard.tsx` (Free/Preis-Badge)
- `src/components/EventDetailSheet.tsx` (Preisanzeige)
- `src/hooks/useSearchEvents.ts` (Param `free_only`)
- `supabase/functions/search-events/index.ts` (Filter `price_cents = 0`)
- `src/pages/Nearby.tsx` (Param durchreichen)
