## Blitzmodus — Quick Fixes

### 1. Admins können Blitzes löschen
Die beiden Konten `jakob.pfeifer@holztechnikum.at` und `benjamin.maxwald@holztechnikum.at` haben bereits die Rolle `admin` in `user_roles`. Korrekte Domain ist `holztechnikum.at` (in deiner Anfrage stand teilweise `holztechikum`).

**DB-Migration:**
- RLS-Policy auf `public.blitz_requests` ergänzen: zusätzlich zu „Hosts can delete own blitz requests" eine neue Policy `Admins can delete any blitz request` mit `USING (public.has_role(auth.uid(),'admin'))`.
- Optional dieselbe DELETE-Policy für `blitz_matches`, `blitz_swipes`, `blitz_chat_messages`, damit beim Löschen eines Blitzes keine Waisen-Datensätze stehen bleiben (alternativ Cascade prüfen — wir setzen Admin-DELETE-Policies auf alle 4 Tabellen).

**UI:**
- In `DiscoveryDeck.tsx` (SwipeCard) für Admins ein kleines Mülleimer-Icon oben rechts an der Karte einblenden (`useIsAdmin` Hook bereits vorhanden). Klick → Bestätigungs-Toast → `supabase.from('blitz_requests').delete().eq('id', item.id)` → Karte aus dem Deck entfernen.
- Außerdem im Blitz-Chat-Header (`/blitz/match/:id`, `BlitzMatch.tsx`) für Admins denselben Lösch-Button anbieten, der den zugehörigen `blitz_request` löscht und zum Messenger zurücknavigiert.

### 2. Blitz-Chat erscheint sofort bei beiden Usern
Aktueller Code in `Messenger.tsx` lädt `blitz_matches` korrekt für Host UND Participant. Die Anzeige hängt jedoch davon ab, dass der Messenger-Tab neu lädt. Maßnahmen:
- **Realtime-Subscription** in `Messenger.tsx` auf `blitz_matches` (INSERT/UPDATE) für `host_id = me OR participant_id = me` ergänzen → Liste sofort refreshen, sobald ein Match entsteht.
- Sicherstellen, dass `blitz_matches` in `supabase_realtime` Publication ist (Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_matches;` falls nicht vorhanden — idempotent prüfen).
- In `useBlitzMatching.ts` (Match-Erkennungslogik): nach Match-Erstellung sofortige Toast + optional Auto-Navigate für den Swiper bleibt; für den Host Realtime-Toast „⚡ Neuer Blitz-Match!" einblenden mit Link zum Chat.

### 3. Profil-Klick auf Blitz-Karte in Discovery
- In `DiscoveryDeck.tsx` SwipeCard: Avatar + Hostname-Bereich klickbar machen → `navigate(`/user/${item.host_id}`)`. Klick darf den Swipe nicht auslösen → `e.stopPropagation()` und Drag-Logik nur starten, wenn nicht auf Profil-Bereich geklickt wurde (z.B. via `data-no-drag` Attribut & Check in `handleStart`).

### 4. Dynamische Schriftgröße für Aktivitäts-Text
Aktuell hartkodiert `text-6xl` in `DiscoveryDeck.tsx` und `ActiveBlitzScreen.tsx` → langer Text wird abgeschnitten.
- Schriftgröße abhängig von `activity.length` berechnen:
  - ≤ 12 Zeichen → `text-6xl`
  - ≤ 20 → `text-5xl`
  - ≤ 32 → `text-4xl`
  - ≤ 48 → `text-3xl`
  - sonst → `text-2xl`
- Helper-Funktion `getActivityFontClass(len: number)` in einer kleinen Util-Datei (`src/lib/blitzText.ts`) ablegen und in beiden Komponenten nutzen.
- Container weiter mit `break-words` und `leading-tight` lassen, damit auch lange Wörter umbrechen.

### Technische Übersicht (Files)
```text
supabase/migrations/<new>.sql           # Admin-DELETE policies + Realtime publication
src/lib/blitzText.ts                    # neuer Font-Size-Helper
src/components/blitz/DiscoveryDeck.tsx  # Admin-Delete, Profil-Klick, dyn. Font
src/components/blitz/ActiveBlitzScreen.tsx # dyn. Font
src/pages/BlitzMatch.tsx                # Admin-Delete-Button im Header
src/pages/Messenger.tsx                 # Realtime-Subscription auf blitz_matches
src/hooks/useBlitzMatching.ts           # ggf. Toast für Host bei neuem Match
```

Keine neuen Secrets, keine neuen Dependencies. Sobald du bestätigst, setze ich alles um.