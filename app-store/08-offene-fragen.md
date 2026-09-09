# Offene Fragen & Entscheidungen (bitte gesammelt beantworten)

Stand 09.09.2026. Alles Machbare ohne dich ist erledigt (siehe `00-uebersicht.md`).
Diese Punkte brauchen deine Antwort oder deinen/Jakobs Zugriff.

---

## A) Kurze Entscheidungen von dir

| # | Frage | Vorschlag / Default |
|---|-------|---------------------|
| A1 | **App-Name im Store** (muss weltweit eindeutig sein) | „EVENDLE" – falls belegt: „EVENDLE – Events & Leute" |
| A2 | **Mindestalter** der App (steht in Datenschutz, AGB, Impressum, Altersfreigabe) | 16 Jahre. Ok? Oder 13 / 18? |
| A3 | **Support-/Kontakt-E-Mail** für den Store & die Rechtstexte | Ich habe `datenschutz@evendle.com`, `abuse@evendle.com`, `hello@evendle.com`, `support@evendle.com` eingesetzt. Existieren die (bzw. leiten sie an dich weiter)? Wenn nicht: alles auf `benjamin@evendle.com` ändern? |
| A4 | **Gewerbe / UID-Nummer** (fürs Impressum) | Hast du ein angemeldetes Gewerbe / eine UID? Wenn nein, lösche ich die Zeilen im Impressum. |
| A5 | **iOS-Push später** – ok, wenn wir die App **ohne** funktionierende iOS-Benachrichtigungen einreichen und Push danach nachrüsten? | Ja (empfohlen). Details `06-oauth-und-push-status.md`. |
| A6 | **Icon** bleibt vorerst das Logo mit Schriftzug? | Ja, laut deiner Nachricht. Mark-only später. |

---

## B) Braucht Jakobs Zugriff (Google Cloud / Apple Portal / Supabase-Dashboard)

Bitte von Jakob prüfen/bestätigen lassen – oder wir testen es einfach live über TestFlight,
sobald die App hochgeladen ist.

| # | Wo | Was muss stimmen |
|---|----|------------------|
| B1 | **Google Cloud Console** → OAuth-Client → Autorisierte Weiterleitungs-URIs | Enthält `https://yhetszgeflsldahfuwen.supabase.co/auth/v1/callback` ? |
| B2 | **Supabase** → Authentication → URL Configuration → Redirect URLs | Enthält `com.evendle.app://login-callback` ? |
| B3 | **Supabase** → Authentication → Providers → **Apple** → „Authorized Client IDs" | Enthält `com.evendle.app` ? |
| B4 | **Supabase** → Edge Functions → Secrets | Sind `VAPID_PUBLIC_KEY` **und** `VAPID_PRIVATE_KEY` gesetzt? (für Web-Push) |
| B5 | **Supabase** → Datenbank/Projekt-Einstellungen | In welcher **Region** liegt das Projekt? (für die Datenschutzerklärung, Abschnitt 6) |

---

## C) Web-Login selbst testen (2 Minuten, brauchst nur einen Browser)

Auf **www.evendle.com** einmal „Mit Google anmelden" und „Mit Apple anmelden" durchklicken.
Frühere Notizen sagen, der Web-Login über den Lovable-Proxy hat auf der Custom-Domain
gehakt. Sag mir, ob es **jetzt** funktioniert oder welche Fehlermeldung kommt.
(Für die iOS-App ist das egal – die nutzt einen eigenen, nativen Login-Weg.)

---

## D) Demo-Account für die Apple-Prüfung

Apple-Prüfer brauchen einen funktionierenden Login. Da Registrierung eine E-Mail-Bestätigung
verlangt, brauchen wir einen **vorab bestätigten** Test-Account. Zwei Wege:
1. Du legst einen an (`review@evendle.com` o. ä.) und bestätigst die E-Mail.
2. Oder Lovable führt eine 1-Zeilen-SQL aus, die den Account bestätigt – sag Bescheid, dann gebe ich dir die Zeile.

Die Zugangsdaten trägst du später in App Store Connect unter „App-Prüfung → Anmeldedaten" ein.

---

## E) Deine nächsten Aktionen (unabhängig von den Fragen oben)

1. **Lovable → „Veröffentlichen"** → dann testen:
   `evendle.com/datenschutz.html`, `/agb.html`, `/impressum.html`
2. **Xcode**: `04-xcode-schritte.md` (Account/Team `7DY4J52V8L` → Archive → Upload)
3. **App Store Connect**: App anlegen, Texte/Fragebögen aus `01-listing-texte.md` + `02-app-datenschutz-fragebogen.md`
4. **Screenshots** vom iPhone → `07-screenshots.md`
