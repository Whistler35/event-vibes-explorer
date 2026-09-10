# Prompt für Jakobs Claude

Jakob: alles zwischen den `====`-Linien in **Claude Code** einfügen (idealerweise im geklonten
`event-vibes-explorer`-Ordner). Falls du nur claude.ai (Web) nutzt, geht es auch – Claude führt
dann nichts selbst aus, sondern sagt dir Schritt für Schritt, wo du klicken musst.

Vorbereitung (einmalig, damit Claude viel selbst machen kann):
- `npx netlify login` – Browser öffnet sich, du autorisierst mit dem Netlify-Account, dem evendle.com gehört
- `npx supabase login` – dito für Supabase

============================================================
Du hilfst dabei, die iOS-App **EVENDLE** in den App Store zu bringen. Der Gründer (Benjamin) und
eine andere Claude-Session haben die gesamte App-Arbeit erledigt: Features, Build, und **Build 1.0 (1)
ist bereits in App Store Connect hochgeladen** und „Bereit zur Übermittlung".

Diese andere Claude-Session kann **nicht** auf die Hosting-/Infrastruktur zugreifen, die ich (Jakob)
verwalte. Deine Aufgabe ist ein eng abgegrenzter Infra-Job:
1. **evendle.com auf Netlify neu deployen** (Hauptpriorität)
2. **Ein paar OAuth-/Push-Konfigurationswerte prüfen** und zurückmelden

**Nicht** dein Job: App-Code ändern, Dinge umbauen, irgendetwas committen oder pushen.

## Repo & Kontext
- Repo: `https://github.com/Whistler35/event-vibes-explorer`, Branch `main`. Wenn du in einem
  lokalen Checkout läufst, nutze den; sonst klone ihn (mit meinen GitHub-Zugangsdaten, nicht mit
  im Repo gefundenen Tokens).
- Lies zuerst `app-store/09-netlify-deploy.md` und `app-store/08-offene-fragen.md` – das ist die
  ausführliche Version. Dieser Prompt ist die Kurzfassung.
- Aktives Supabase-Projekt: **`yhetszgeflsldahfuwen`**. Der Wert `wrqckgrnshklyaiilprz` in
  `supabase/config.toml` ist veraltet – ignorieren.

## Aufgabe A – Netlify-Deploy (wichtigste)
`www.evendle.com` läuft auf Netlify und liefert einen **alten Build** (ca. 28. Juli) aus.
`https://www.evendle.com/datenschutz.html` gibt aktuell die App zurück statt der Datenschutzseite –
d. h. der neue Build fehlt. Apple braucht diese URL live.

Vorgehen (per `netlify` CLI, soweit möglich selbst; sonst mich durch die Web-UI führen):
1. `npx netlify status` bzw. `npx netlify sites:list` → die evendle-Site finden. Ggf.
   `npx netlify link` im Repo-Ordner.
2. Deploy-Historie / „Deploys"-Tab ansehen: Wie wird deployt (GitHub-Auto / manuell)? Schlagen
   Builds fehl? Falls ja: Log lesen (häufig: Node-Version, fehlende Env-Vars, `bun.lockb` vs
   `package-lock.json`).
3. Neuen Deploy erzeugen – eine der Optionen:
   - Git-verknüpft & Auto-Publish an: „Clear cache and deploy site" (Dashboard) oder
     `npx netlify build && npx netlify deploy --prod`
   - Nicht verknüpft / unklar: einmalig manuell
     `npm ci && npm run build && npx netlify deploy --prod --dir=dist`
4. Verifizieren:
   - `curl -sI https://www.evendle.com/datenschutz.html` → echte Seite (nicht die SPA-`index.html`),
     ebenso `/agb.html` und `/impressum.html`
   - `https://www.evendle.com` lädt normal, Registrierung ohne „Professional Host"-Auswahl
5. `public/_redirects` (`/* /index.html 200`) **nicht** ändern – echte Dateien werden vor der
   SPA-Weiterleitung ausgeliefert.

## Aufgabe B – Konfig prüfen (Befunde melden; nur triviale, sichere Dinge nach meiner Freigabe ändern)
- **B1** Google Cloud Console → APIs & Services → Credentials → OAuth-2.0-Client →
  „Authorized redirect URIs" muss enthalten:
  `https://yhetszgeflsldahfuwen.supabase.co/auth/v1/callback`
- **B2** Supabase → Authentication → URL Configuration → „Redirect URLs" muss enthalten:
  `com.evendle.app://login-callback`
- **B3** Supabase → Authentication → Providers → Apple → „Authorized Client IDs" muss enthalten:
  `com.evendle.app`
- **B4** Supabase Edge-Function-Secrets: nach `npx supabase link --project-ref yhetszgeflsldahfuwen`
  → `npx supabase secrets list` → bestätigen, dass `VAPID_PUBLIC_KEY` **und** `VAPID_PRIVATE_KEY`
  existieren.
- **B5** Supabase → Project Settings → General → **Region** notieren (für den Datenschutztext).

## Aufgabe C – erst später (wenn Benjamin einen APNs-Key liefert, NICHT jetzt)
- **P4** Supabase-Secrets setzen (`npx supabase secrets set …`):
  `APNS_KEY_ID`, `APNS_TEAM_ID=7DY4J52V8L`, `APNS_PRIVATE_KEY` (voller .p8-Inhalt),
  `APNS_BUNDLE_ID=com.evendle.app`, `APNS_HOST=api.push.apple.com`
- **P5** `npx supabase functions deploy send-push-notification`
- Details: `app-store/06-oauth-und-push-status.md`

## Fragen, die nur ich (Jakob) beantworten kann – fragen, auf Antwort warten, nicht raten
1. Welcher Netlify-Account/-Team besitzt die evendle-Site? (`netlify login` mit genau dem)
2. Netlify dauerhaft mit GitHub `main` für Auto-Deploy verbinden, oder manuell lassen?
3. Bei B1/B2/B3: den fehlenden Wert wirklich hinzufügen? (nur mit meiner ausdrücklichen
   Freigabe – betrifft den Produktions-Login)

## Grenzen
- Niemals Dateien unter `src/`, `supabase/functions/` (außer die bestehende Function unverändert
  deployen), `ios/` oder `capacitor.config.ts` ändern.
- Niemals committen oder pushen. Wenn der Deploy eine Repo-Änderung bräuchte (sollte nicht),
  stoppen und melden.
- Keine Secret-Werte eingeben, die ich dir nicht ausdrücklich für diese Aufgabe gegeben habe.

## Abschluss
Melde zurück: (a) Deploy-Status + die 3 geprüften URLs, (b) Befunde zu B1–B5, (c) offene Blocker.
============================================================
