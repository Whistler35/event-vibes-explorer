

# Evendle Backend-Architektur -- Plan

## Wichtiger Kontext

Dieses Projekt laeuft auf **Lovable** mit **Supabase** als Backend. Es gibt keinen separaten Application Server (kein Node/NestJS/Go). Die gesamte Backend-Logik wird ueber **Supabase Postgres + RLS + Edge Functions + Storage** abgebildet. Das ist die pragmatisch richtige Entscheidung: Supabase bietet Auth, PostGIS, RLS, Realtime, Storage und Edge Functions -- alles was Evendle braucht, ohne Infrastruktur-Overhead.

---

## A) Tech-Stack (bereits festgelegt, wird erweitert)

| Komponente | Loesung |
|---|---|
| API | Supabase Client SDK + Edge Functions |
| DB | Supabase Postgres + **PostGIS Extension** |
| Auth | Supabase Auth (JWT, bereits aktiv) |
| Storage | Supabase Storage (Buckets existieren bereits) |
| Realtime | Supabase Realtime (fuer Chat, bereits angelegt) |
| Cache | Clientseitig via React Query (bereits vorhanden) |
| Search | Postgres Full-Text Search (pg_trgm) |

---

## B) Was existiert vs. was fehlt

### Existiert bereits:
- `events` Tabelle (aber ohne category, source, visibility, PostGIS geography)
- `profiles` Tabelle mit Auto-Create Trigger
- `event_participants` + `event_chats` + `chat_messages`
- Storage Buckets (event-images, avatars)
- Auth mit Email/Password

### Fehlt (wird implementiert):
1. **PostGIS Extension + Geography Column** auf events
2. **Category Enum** + `source` / `visibility` Felder auf events
3. **join_requests Tabelle** (pending/accepted/rejected/cancelled)
4. **Geo-Indizes** fuer Bounding Box / Radius Queries
5. **RLS-Policies zuruecksetzen** (aktuell ist alles public -- Sicherheitsluecke)
6. **Edge Function** fuer Geo-Queries mit Filtern
7. **Frontend-Integration** der neuen Datenstrukturen

---

## C) Datenmodell -- Migrationen

### Migration 1: PostGIS + Events-Schema erweitern

```sql
-- PostGIS aktivieren
CREATE EXTENSION IF NOT EXISTS postgis;

-- Category Enum
CREATE TYPE public.event_category AS ENUM (
  'music', 'sports', 'culture', 'food', 'nightlife',
  'outdoor', 'community', 'workshop', 'other'
);

-- Source Enum
CREATE TYPE public.event_source AS ENUM ('curated', 'imported', 'community');

-- Visibility Enum
CREATE TYPE public.event_visibility AS ENUM ('public', 'unlisted');

-- Neue Spalten auf events
ALTER TABLE public.events
  ADD COLUMN category public.event_category DEFAULT 'other',
  ADD COLUMN source public.event_source DEFAULT 'community',
  ADD COLUMN visibility public.event_visibility DEFAULT 'public',
  ADD COLUMN location geography(Point, 4326);

-- Geography aus lat/lng befuellen
UPDATE public.events
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Trigger: location automatisch aus lat/lng setzen
CREATE OR REPLACE FUNCTION public.sync_event_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(
      ST_MakePoint(NEW.longitude, NEW.latitude), 4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_location_on_upsert
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.sync_event_location();

-- Indizes
CREATE INDEX idx_events_location ON public.events USING GIST (location);
CREATE INDEX idx_events_category ON public.events (category);
CREATE INDEX idx_events_event_date ON public.events (event_date);
CREATE INDEX idx_events_source ON public.events (source);
CREATE INDEX idx_events_visibility ON public.events (visibility);
```

### Migration 2: join_requests Tabelle

```sql
CREATE TYPE public.join_request_status AS ENUM (
  'pending', 'accepted', 'rejected', 'cancelled'
);

CREATE TABLE public.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Jeder sieht eigene Requests
CREATE POLICY "Users see own requests"
ON public.join_requests FOR SELECT
USING (auth.uid() = user_id);

-- Event-Owner sieht Requests fuer seine Events
CREATE POLICY "Owners see requests for their events"
ON public.join_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = join_requests.event_id
    AND events.created_by = auth.uid()
  )
);

-- Eingeloggte User koennen Requests erstellen
CREATE POLICY "Auth users can request"
ON public.join_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Owner kann Status aendern
CREATE POLICY "Owner can update request status"
ON public.join_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = join_requests.event_id
    AND events.created_by = auth.uid()
  )
);

-- User kann eigenen Request canceln
CREATE POLICY "User can cancel own request"
ON public.join_requests FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE INDEX idx_join_requests_event ON public.join_requests(event_id);
CREATE INDEX idx_join_requests_user ON public.join_requests(user_id);
CREATE INDEX idx_join_requests_status ON public.join_requests(status);

CREATE TRIGGER update_join_requests_updated_at
BEFORE UPDATE ON public.join_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Migration 3: RLS fuer Events reparieren

```sql
-- Unsichere Demo-Policies entfernen
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Anyone can create events" ON public.events;
DROP POLICY IF EXISTS "Anyone can update events" ON public.events;
DROP POLICY IF EXISTS "Anyone can delete events" ON public.events;

-- Public read fuer sichtbare Events (kein Login noetig)
CREATE POLICY "Public can view visible events"
ON public.events FOR SELECT
USING (visibility = 'public');

-- Nur eingeloggte User erstellen Community Events
CREATE POLICY "Auth users create events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Owner kann eigene Events bearbeiten
CREATE POLICY "Owner updates own events"
ON public.events FOR UPDATE
USING (auth.uid() = created_by);

-- Owner kann eigene Events loeschen
CREATE POLICY "Owner deletes own events"
ON public.events FOR DELETE
USING (auth.uid() = created_by);
```

---

## D) Edge Function: Geo-Event-Suche

Eine neue Edge Function `search-events` fuer gefilterte Geo-Queries:

```
POST /search-events
Body: {
  bbox?: { sw_lat, sw_lng, ne_lat, ne_lng },
  radius?: { lat, lng, meters },
  category?: string,
  source?: string,
  date_from?: string,
  date_to?: string,
  text?: string,
  limit?: number,
  offset?: number
}
```

Intern nutzt sie Supabase Service Role + PostGIS:
- `ST_MakeEnvelope` fuer Bounding Box
- `ST_DWithin` fuer Radius
- Kombiniert mit category/date/text Filtern

---

## E) Security-Fixes

1. **Events RLS**: Weg von "Anyone can do anything" zu proper Owner-based Policies
2. **Storage**: Event-Images Upload nur fuer eingeloggte User (aktuell public)
3. **created_by auf Events**: Fuer importierte/curated Events nullable machen
4. **Rate Limiting**: Ueber Edge Function Headers (X-RateLimit)

---

## F) Supabase Types Update

Nach den Migrationen wird `src/integrations/supabase/types.ts` automatisch regeneriert mit:
- Neuen Enums (event_category, event_source, event_visibility, join_request_status)
- join_requests Tabelle
- Erweiterte events Felder

---

## G) Frontend-Anpassungen (minimal)

- `CreateEventDialog`: Category-Dropdown, Source wird automatisch auf 'community' gesetzt
- `MapboxMap`: Events via `search-events` Edge Function laden statt direkt aus Tabelle
- Neue Komponente `JoinRequestButton` fuer Community Events
- `EventDetail`: Join Requests anzeigen fuer Owner

---

## Implementierungs-Reihenfolge

1. PostGIS Extension + Events-Schema erweitern (Migration)
2. join_requests Tabelle (Migration)
3. RLS Policies reparieren (Migration)
4. created_by nullable machen fuer curated Events (Migration)
5. Edge Function `search-events` mit Geo-Queries
6. Supabase Types regenerieren
7. Frontend: Category-Auswahl + Join Request Flow
8. Storage Policies fixen (auth required fuer Upload)

