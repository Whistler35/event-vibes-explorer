# Apple-Review – Pflicht-Punkte, die noch FEHLEN

Apple lehnt Social-/Kennenlern-Apps sehr zuverlässig ab, wenn diese Dinge fehlen. Ich habe den
Code geprüft (Stand: aktueller `main`). Ergebnis:

| # | Pflicht (Apple-Guideline) | Im Code vorhanden? | Aufwand |
|---|---------------------------|--------------------|---------|
| A | **Nutzer blockieren** (1.2) | ❌ nein | mittel |
| B | **Inhalte / Nutzer melden** (1.2) | ❌ nein | mittel |
| C | **Konto in der App löschen** (5.1.1 v) | ❌ nein | klein–mittel |
| D | **Nutzungsbedingungen / EULA** mit „keine Toleranz für anstößige Inhalte" (1.2) | ❌ nein | klein (Textseite) |
| E | Datenschutzerklärung öffentlich erreichbar (5.1.1) | ⚠️ Entwurf liegt vor (`public/datenschutz.html`), noch nicht veröffentlicht & ausgefüllt | klein |
| F | Login-Testzugang für den Prüfer (Demo-Account) | ⚠️ müssen wir anlegen | klein |
| G | „Sign in with Apple" vorhanden (4.8, weil Google-Login angeboten) | ✅ ja | – |

## Was das bedeutet

**A, B, C** sind echte Funktionen, die programmiert werden müssen (UI + Supabase-Tabellen + Rechte/RLS).
Das ist der größte Brocken auf dem Weg in den Store. Zwei Wege:

1. **Ich baue es** direkt hier im Code (empfohlen, ich kann Tabellen-Migration + UI + Tests machen).
2. **Du lässt es Lovable bauen** – dann gib Lovable exakt diesen Prompt:
   > „Add three features required by Apple App Review: (1) Block user – a user can block another user from
   > their profile and from a chat; blocked users can't message or see each other. (2) Report – a user can
   > report another user or a message with a reason; store reports in a `reports` table. (3) Delete account –
   > a button in Profile → Settings that deletes the user's auth account and all their data (profile,
   > messages, blitz entries) via a Supabase RPC/Edge Function. Add matching tables with RLS."

**D** ist nur eine Textseite (wie die Datenschutzerklärung) – die schreibe ich als `public/agb.html`.

**E** – du füllst die grün markierten Stellen in `datenschutz.html` aus, dann deployen wir (Git push → Lovable/Netlify).

**F** – wir legen einen Test-Account an (z. B. `review@evendle.com`) und tragen die Zugangsdaten in
App Store Connect unter „App-Prüfung → Anmeldedaten" ein.

## Reihenfolge-Vorschlag

1. Xcode-Signierung einrichten (parallel möglich, blockiert nichts) → siehe `04-xcode-schritte.md`
2. A/B/C bauen (ich oder Lovable)
3. AGB-Seite + Datenschutz-Seite fertig & deployen
4. Icons/Screenshots
5. App Store Connect Eintrag + Texte + Fragebögen
6. Archive hochladen → einreichen
