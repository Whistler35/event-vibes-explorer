# Netlify: was Jakob machen muss

**Problem:** `www.evendle.com` läuft auf **Netlify** und zeigt einen **alten Build** (letzte Veröffentlichung ~28. Juli).
Alle Änderungen von 09.09.2026 liegen auf GitHub (`Whistler35/event-vibes-explorer`, Branch `main`), sind aber **nicht live**.
Test: `https://www.evendle.com/datenschutz.html` zeigt aktuell die App statt der Datenschutzseite → neuer Build fehlt.

**Ziel:** Ein aktueller Deploy, damit
`/datenschutz.html`, `/agb.html`, `/impressum.html` live sind (Apple verlangt die Datenschutz-URL erreichbar) –
und die App-Änderungen (Registrierung, Moderation etc.) auf evendle.com ankommen.

---

## Schritt 1 – Herausfinden, wie die Seite deployt

app.netlify.com → Site **evendle** (o. ä.) öffnen:

1. **Deploys** (Tab): Wann war der letzte Deploy? Woher (GitHub / manuell / CLI)? Gibt es **fehlgeschlagene** Deploys?
2. **Site configuration → Build & deploy → Continuous deployment**:
   - Ist ein Git-Repo verknüpft? Welches? Welcher Branch?
   - **Build command** (soll `npm run build` sein) · **Publish directory** (soll `dist` sein) · Node-Version
   - **Auto publishing** aktiv (nicht „Stopped")?

## Schritt 2 – Je nach Befund

### Fall A: Repo ist verknüpft, Auto-Deploy an, aber nichts kommt an
- In **Deploys** nach fehlgeschlagenen Builds sehen und Log lesen (häufige Ursachen: Node-Version, fehlende Env-Vars, `bun.lockb` vs `package-lock.json`).
- Prüfen, dass **Auto publishing** nicht pausiert ist.
- Manuell anstoßen: **Deploys → Trigger deploy → „Clear cache and deploy site"**.

### Fall B: Repo verknüpft, aber falscher Branch / falsches Repo
- Auf `Whistler35/event-vibes-explorer`, Branch **`main`** umstellen. Dann Deploy triggern.

### Fall C: Kein Git verknüpft (bisher manuell/CLI deployt)
Entweder dauerhaft verknüpfen:
- **Site configuration → Build & deploy → Link repository** → GitHub → `event-vibes-explorer` → Branch `main`
- Build command: `npm run build` · Publish directory: `dist`
- Ab dann deployt jeder Push auf `main` automatisch.

Oder einmalig manuell (schnellster Weg für jetzt), lokal im Projektordner:
```bash
git pull
npm install
npm run build
npx netlify deploy --prod --dir=dist
```
(oder den erzeugten `dist/`-Ordner per Drag & Drop in die Netlify-„Deploys"-Seite ziehen)

## Schritt 3 – Environment-Variablen prüfen

Der Build braucht `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`,
`VITE_VAPID_PUBLIC_KEY`. Diese stehen aktuell in der (im Repo eingecheckten) `.env`, d. h. der Build
funktioniert auch ohne Netlify-Dashboard-Vars. Falls ein Build mit „env var undefined" o. ä.
scheitert: dieselben Werte unter **Site configuration → Environment variables** eintragen.

## Schritt 4 – Nach dem Deploy verifizieren

- <https://www.evendle.com/datenschutz.html> → zeigt die **Datenschutzseite** (nicht die App)
- <https://www.evendle.com/agb.html> und <https://www.evendle.com/impressum.html> → analog
- <https://www.evendle.com> → App lädt normal, Registrierung ohne „Professional Host"-Auswahl

> `public/_redirects` (`/* /index.html 200`) muss **nicht** geändert werden – Netlify liefert echte
> Dateien wie `/datenschutz.html` vor der SPA-Weiterleitung aus.

## Nebenpunkte für Jakob (aus `08-offene-fragen.md`), wenn er schon dabei ist

- **B1** Google Cloud Console → OAuth-Client → Redirect-URI `https://yhetszgeflsldahfuwen.supabase.co/auth/v1/callback` vorhanden?
- **B2** Supabase → Authentication → URL Configuration → Redirect URLs enthält `com.evendle.app://login-callback`?
- **B3** Supabase → Authentication → Providers → Apple → „Authorized Client IDs" enthält `com.evendle.app`?
- **B4** Supabase → Edge Functions → Secrets: `VAPID_PUBLIC_KEY` **und** `VAPID_PRIVATE_KEY` gesetzt?
- **B5** Supabase → Projekt-Region (für die Datenschutzerklärung, Abschnitt 6)
- **P4/P5** (später, für iOS-Push): APNs-Secrets setzen + Edge Function `send-push-notification` neu deployen – Details in `06-oauth-und-push-status.md`
