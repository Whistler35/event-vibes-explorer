
## "I'm in!" — vom stillen Toast zum echten Erlebnis

Aktuell passiert beim "I'm in!" technisch alles richtig (Eintrag in `event_participants`, Auto-Ticket per Trigger, Chat-Zugang per RLS), aber **gefühlt** passiert nichts: kleiner Toast oben, Button wechselt zu "Leave event" — fertig. Wir machen daraus einen Moment, der den User direkt zum **Veranstaltungschat** führt, wo der Austausch mit den anderen Teilnehmern stattfindet.

---

### 1. Confirmation-Overlay direkt nach Join (1.5–2s)

Vollbild-Overlay im Forest/Citrus-Stil (kein Pink, kein Dating-Vibe):
- Großer animierter Check ✓ mit Shockwave-Ring
- Headline: **"Du bist dabei!"**
- Subline: Eventname + Datum
- Kleiner Hinweis unten: *"Gruppenchat ist freigeschaltet 💬"*
- Auto-Dismiss oder Tap to skip → scrollt zum neuen Status-Block

Neue Komponente: `src/components/EventJoinedConfirmation.tsx`
Neue Keyframes in `src/index.css`: `joined-check-pop`, `joined-shockwave`, `joined-fade`

---

### 2. Neuer Teilnehmer-Status-Block (ersetzt "Leave event"-Button)

Wenn `isParticipant === true`, zeigt die Event-Detail-Seite einen prominenten Card-Block statt dem aktuellen grauen Leave-Button:

```text
┌─────────────────────────────────────────┐
│  ✓  Du bist dabei!                      │
│     Heute · 18:00 · in 2 Std            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💬  Veranstaltungs-Chat        [3 neu] │  ← prominent, ganze Breite
│     "Marc: Ich bring noch Bier mit..."  │
│     Letzte Nachricht vor 5 min          │
└─────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────────┐
│ 🎟Ticket │ │ 📍Route │ │ 📅 Kalender │
└──────────┘ └──────────┘ └──────────────┘

Mitstreiter (5)
👤 👤 👤 👤 👤  → klickbar → Profile/DM

           [Doch absagen] (klein, dezent)
```

**Chat-Card im Detail** (das Herzstück):
- Volle Breite, Forest-Background, Citrus Akzent
- Live-Preview: letzte Nachricht + Absendername (Realtime via `chat_messages` Subscription)
- Unread-Badge: zählt Nachrichten seit `conversation_reads.last_read_at` (System wiederverwendbar)
- Tap → öffnet `/event/:id/chat` (existierende Seite)
- Wenn noch keine Nachrichten: Placeholder *"Sei der Erste, der etwas schreibt 👋"*

**Quick-Ticket** (Sheet, kein Umweg über `/tickets`):
- Bottom Sheet mit dem QR-Code für genau dieses Event
- Lädt aus `event_tickets` für aktuellen User+Event
- QR via `qrcode.react` (bereits im Projekt? → sonst `bun add qrcode.react`)

**Route**: öffnet `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` in neuem Tab → Maps-App auf Mobile

**Kalender**: generiert `.ics` aus Event-Daten und triggert Download (neue Util `src/lib/calendar.ts`)

**Countdown**: smarte Anzeige
- > 7 Tage: "In 12 Tagen · Sa, 14:00"
- < 7 Tage: "Heute in 2 Std" / "Morgen · 18:00"
- Läuft: "Läuft jetzt 🔴"
- Vorbei: "Beendet" + Card greyed out

**"Doch absagen"**: als kleiner Text-Button unten, mit Confirm-Dialog (`AlertDialog`)

---

### 3. Verhalten

- Nach erfolgreichem Join: Overlay zeigen → nach Dismiss smooth scroll zum Status-Block
- Wenn User die Event-Detail-Seite bereits als Teilnehmer öffnet: Overlay NICHT zeigen, direkt Status-Block
- Chat-Preview & Unread-Count updaten via Realtime-Subscription auf `chat_messages`

---

### 4. Technische Details

**Neue Files:**
- `src/components/EventJoinedConfirmation.tsx` — Vollbild-Overlay
- `src/components/EventParticipantStatus.tsx` — Status-Block mit allen Action-Cards
- `src/components/EventChatPreviewCard.tsx` — Chat-Preview-Card mit Live-Update + Unread-Badge
- `src/components/QuickTicketSheet.tsx` — Bottom Sheet mit QR-Code
- `src/lib/calendar.ts` — `generateIcsFile(event)` → triggert Download

**Edits:**
- `src/pages/EventDetail.tsx` — `justJoined`-State, Overlay-Render, `EventParticipantStatus` statt Leave-Button, alte "Show ticket" / "Open chat"-Buttons entfernen (sind jetzt im Status-Block)
- `src/index.css` — Keyframes für Confirmation-Animation

**Dependency** (falls nicht vorhanden): `bun add qrcode.react`

**Optional Migration** (kann später kommen): Trigger auf `event_participants` INSERT, der eine Row in `notifications` für `events.created_by` einfügt — damit der Veranstalter eine Glocken-Notification bekommt. Lasse ich für diesen Schritt erstmal raus, um den Scope schlank zu halten.

---

### 5. Was außerhalb des Scopes ist

- Kein neues Theme, keine Änderungen am Bottom-Nav
- Host-Notification beim Join (kann ich auf Wunsch ergänzen)
- Push-Notifications für neue Chat-Nachrichten (separates Thema)

Nach Approval setze ich Migration (falls nötig — hier keine Schema-Änderung), Komponenten und EventDetail-Rewrite in einem Schritt um.
