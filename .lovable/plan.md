## Fixes

### 1) 404-Flash "Wer bist du?" beheben
Ursache: `NotFound` (Route `*`) rendert momentan eine ungebrandete graue Seite. Beim ersten Rendern eines unbekannten Pfades ist zusätzlich `AuthContext` noch am Laden – dadurch kann kurz die Onboarding-Seite (Titel „Wer bist du?") oder ein Layout-Placeholder aufblitzen, wenn Redirect-Logik greift.

Fix:
- `NotFound` an das Evendle Design anpassen (Forest-Hintergrund, Bolt-Akzent, „EVENDLE" Wortmarke, klare 404-Message + Button „Zurück zu Blitz").
- In `NotFound` auf `useAuth().loading` warten und in diesem Fall einen neutralen Forest-Splash rendern (kein Redirect, kein Onboarding-Flash).
- Sicherstellen, dass `Suspense`-Fallback ebenfalls Forest-Hintergrund verwendet (kein weißer/Onboarding-Flash).

### 2) Eigener Blitz-Huddle erscheint unter „Chats"
Ist heute nur sichtbar, sobald bereits ein `blitz_match` existiert. Ziel: sobald der User selbst einen Blitz erstellt, erscheint der zugehörige Huddle-Chat sofort in `/messenger` – auch bevor jemand gematcht hat.

Fix in `src/pages/Messenger.tsx`:
- Zusätzliche Query auf `blitz_requests` des aktuellen Users mit `status = 'active'` und `expires_at > now()`.
- Für jeden aktiven eigenen Request, für den es noch keinen `blitz_match`-Eintrag in der Liste gibt, einen synthetischen Huddle-Eintrag anhängen:
  - Titel: `activity` des Requests
  - Untertitel: „Warte auf Teilnehmer…" (bzw. i18n)
  - Klick → navigiert zur Blitz-Seite (bzw. zum Match, sobald vorhanden)
  - Ablauf-Countdown analog zu Match-Chats
- Realtime bereits auf `blitz_matches` / `blitz_chat_messages` gesetzt – zusätzlich Subscription auf `blitz_requests` (INSERT/UPDATE) für den eigenen User, damit die Liste sofort aktualisiert.

### 3) Abgelaufene Huddles ausblenden (zentrale Logik)
Bereits teilweise vorhanden (Filter `status='active'` + `chat_expires_at > now()`), aber:
- Client-seitig zusätzlich alle 30s neu evaluieren, damit ein Huddle direkt aus der Liste verschwindet, wenn `chat_expires_at` im aktiven UI überschritten wird (setInterval → `queryClient.invalidateQueries`).
- Gemeinsame Helper-Funktion `isHuddleActive(match | request)` in `src/lib/blitzText.ts` (oder neue `blitzHuddle.ts`), die in Messenger, `MyMatchesBanner` und ggf. `ActiveBlitzScreen` gleich verwendet wird → konsistente Sichtbarkeitslogik.
- Für den Fall, dass ein eigener Request abgelaufen ist, wird er ebenfalls NICHT mehr in der Chat-Liste angezeigt.

## Betroffene Dateien
- `src/pages/NotFound.tsx` – Redesign + Auth-Loading-Guard
- `src/App.tsx` – Suspense-Fallback vereinheitlichen (Forest)
- `src/pages/Messenger.tsx` – eigenen Blitz-Request als Huddle-Eintrag, Realtime + Interval-Refresh, gemeinsame Helper-Nutzung
- `src/lib/blitzHuddle.ts` *(neu)* – `isHuddleActive` Helper
- `src/i18n/locales/de.json` & `en.json` – neue Strings (404, „Warte auf Teilnehmer…")

Keine Datenbank-Änderungen nötig.