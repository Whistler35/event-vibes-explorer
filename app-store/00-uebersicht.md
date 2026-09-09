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
- **Blockieren / Melden / Konto löschen**: gebaut, DB-Migration von Lovable ausgeführt, Typen regeneriert, nativer iOS-Build grün
- DB-Fakt: aktives Supabase-Projekt ist `yhetszgeflsldahfuwen` (nicht der Wert in config.toml)
- **App-Icon** eingebaut (dein Logo, 1024², Apple-konform) – „Mark-only"-Variante wäre schöner (optional)
- **Datenschutzerklärung + AGB** mit echten Daten gefüllt (`public/datenschutz.html`, `public/agb.html`) – nur Supabase-Serverregion noch offen
- Alle Commits auf GitHub, GitHub = Lovable = lokal in sync

### 🔜 Als Nächstes – von dir
1. In Lovable **„Veröffentlichen"** → damit `evendle.com/datenschutz.html` und `/agb.html` live gehen. Danach beide URLs im Browser testen.
2. **Xcode**: Account einloggen, signieren, Archive, Upload → `04-xcode-schritte.md`
3. **App Store Connect**: App anlegen + Texte/Fragebögen → `01-listing-texte.md`, `02-app-datenschutz-fragebogen.md`
4. Screenshots vom iPhone (oder aus der Lovable-Vorschau eingeloggt)
5. Demo-Account für die Apple-Prüfung anlegen (E-Mail bestätigt)

### 🔜 Optional / später – von mir
- „Mark-only" App-Icon, sobald du die Symbol-Datei einzeln lieferst
- In-App-Links zu Datenschutz/AGB (Apple sieht das gern)
- Kleine Admin-Ansicht für eingegangene Meldungen
- Impressum-Seite (§ 5 ECG, für AT Pflicht auf der Website)
