## Ziel

Aktuell sieht man im Blitz-Screen über dem Hauptbereich nur eine kleine Zeile pro angefragtem Blitz ("Your Requests" mit Avatar, Aktivität, Countdown, X). Du willst die ganze Blitz-Karte (so wie im Discover-Deck) wieder ansehen können, indem du auf diese Zeile tippst.

## Änderungen

### 1. `src/components/blitz/MyPendingSwipesList.tsx`
- Die ganze Zeile (das `div` mit Avatar + Text + Countdown) wird klickbar.
- Klick öffnet ein neues Sheet/Modal mit der Vollansicht des angefragten Blitz.
- Der existierende X-Button (Anfrage zurückziehen) bekommt `stopPropagation`, damit er den Klick nicht auslöst.

### 2. Neue Komponente `src/components/blitz/PendingSwipeDetailSheet.tsx`
- Bottom-Sheet (oder Dialog) im gleichen Look wie eine Discover-`SwipeCard`:
  - Forest Hintergrund, Pink Glow
  - Avatar + Hostname (klickbar → `/user/:hostId`)
  - Große Aktivität ("Coffee?") mit `getActivityFontClass`
  - Countdown bis `expires_at` in Pink
  - Status-Badge "⚡ Wartet auf Antwort…"
- Buttons unten:
  - "Schließen" (Ghost)
  - "Anfrage zurückziehen" (rot/destructive) → ruft `withdrawSwipe()` auf, schließt Sheet, ruft `reload()` auf der Liste auf

### 3. State in `MyPendingSwipesList`
- `selectedSwipe: PendingSwipe | null`
- Klick auf eine Zeile setzt `selectedSwipe`.
- Sheet liest alle Daten aus `selectedSwipe` (Aktivität, Host-Name/Avatar, Countdown, host_id für Profil-Link).

## Was sich nicht ändert

- Kein Backend, keine RLS, keine Migration nötig — alle Daten sind schon im Hook (`useMyPendingSwipes`).
- `DiscoveryDeck`, `ActiveBlitzScreen` und Matching-Logik bleiben unverändert.
- Distanz wird im Sheet weggelassen (Hook liefert sie aktuell nicht; wenn du sie unbedingt willst, müssten wir `latitude`/`longitude` im Hook mitladen — sag Bescheid).

## Offene Frage

Soll im Sheet zusätzlich ein Button "Profil ansehen" sichtbar sein, oder reicht der Tap auf den Avatar/Namen wie in der Discover-Karte?