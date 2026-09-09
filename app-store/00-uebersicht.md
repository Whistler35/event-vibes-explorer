# EVENDLE → App Store: Übersicht & Fortschritt

Dieser Ordner sammelt alles, was für die App-Store-Einreichung gebraucht wird.
Reihenfolge der Dateien = grobe Reihenfolge der Arbeit.

| Datei | Inhalt |
|-------|--------|
| `00-uebersicht.md` | dieses Dokument |
| `01-listing-texte.md` | Alle Texte für den Store-Eintrag (Name, Beschreibung, Keywords, Kategorien, Altersfreigabe) – zum Kopieren |
| `02-app-datenschutz-fragebogen.md` | Vorausgefüllte Antworten für Apples „App-Datenschutz"-Fragebogen |
| `03-review-blocker.md` | **Wichtig:** Funktionen, die noch fehlen und die Apple verlangt (Blockieren, Melden, Konto löschen, AGB) |
| `04-xcode-schritte.md` | Signierung in Xcode + Archive + Upload, Schritt für Schritt |
| `05-pflicht-funktionen-anwenden.md` | Blockieren/Melden/Löschen: SQL in Supabase ausführen + Testanleitung |
| `06-oauth-und-push-status.md` | Google/Apple-Login + Push: was geprüft ist, was noch fehlt |
| `07-screenshots.md` | Screenshot-Größen und was zu zeigen ist |
| `08-offene-fragen.md` | **Gesammelte Fragen an dich** + deine nächsten Aktionen |

## Statusüberblick

### ✅ Erledigt
- Code auf neuesten GitHub-Stand gebracht
- Abhängigkeits-Konflikte behoben (`push-notifications` v8→v7; unbenutztes `codetrix-google-auth` entfernt)
- Web-App gebaut + via `cap sync` ins iOS-Projekt übertragen
- Info.plist: Pflicht-Texte für Standort/Kamera/Fotos + Verschlüsselungs-Flag ergänzt
- Kompletter Test-Build fürs iPhone erfolgreich (`** BUILD SUCCEEDED **`)
- Version 1.0 / Build 1 / Bundle-ID `com.evendle.app` / Automatic Signing – korrekt gesetzt
- Datenschutzerklärung als Entwurf: `public/datenschutz.html`
- Nutzungsbedingungen als Entwurf: `public/agb.html`
- Store-Texte, Datenschutz-Fragebogen, Xcode-Anleitung (dieser Ordner)

### ✅ Erledigt (Stand 09.09.2026)
- Apple-Account: **Einzelperson**, Team ID `7DY4J52V8L`, gültig bis Mai 2027
- **Blockieren / Melden / Konto löschen**: gebaut, DB-Migration von Lovable ausgeführt, Typen regeneriert
- **Konto-Typ-Auswahl** (Privat/Professional Host) aus der Registrierung entfernt – nur noch normale User
- **App-Icon** eingebaut (dein Logo)
- **Datenschutzerklärung + AGB + Impressum** mit echten Daten gefüllt (`public/*.html`), In-App-Links im Login & Profil
- **Google/Apple-Login geprüft**: Provider auf Supabase aktiv, native Flows korrekt codiert (offene Punkte → `08-offene-fragen.md` B1–B3)
- **Push geprüft**: Web-Push vorhanden; iOS-APNs-Push fehlt noch (Arbeitspaket nach Release, `06-...md`)
- Nach jeder Änderung: Web-Build + TypeScript + **nativer iOS-Build grün**
- Alle Commits auf GitHub, GitHub = Lovable = lokal in sync

### 🔜 Als Nächstes – von dir
→ **Alles in `08-offene-fragen.md`**: kurze Fragen (A), Punkte für Jakob (B), Web-Login-Test (C),
Demo-Account (D) und deine Aktionen (E: Veröffentlichen, Xcode, App Store Connect, Screenshots).

### 🔜 Optional / später – von mir
- „Mark-only" App-Icon, sobald du die Symbol-Datei einzeln lieferst
- iOS-Push: APNs-Zweig in der Edge Function bauen (sobald APNs-Key da ist)
- Kleine Admin-Ansicht für eingegangene Meldungen
