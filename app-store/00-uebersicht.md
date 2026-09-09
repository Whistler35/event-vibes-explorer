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

### ✅ Neu erledigt
- Apple-Account geprüft: **Einzelperson**, Team ID `7DY4J52V8L`, gültig bis Mai 2027
- **Blockieren / Melden / Konto löschen** komplett gebaut (Code + DB-Migration), Web-Build grün, TypeScript fehlerfrei

### 🔜 Als Nächstes – von dir
1. **SQL in Supabase ausführen** → `05-pflicht-funktionen-anwenden.md` (5 Min, kein Terminal)
2. Die 3 Funktionen testen (Anleitung in derselben Datei)
3. Logo als `icon-source.png` in den Projekt-Hauptordner legen
4. `public/datenschutz.html` und `public/agb.html`: grün markierte Platzhalter ausfüllen (Adresse: Dr. Langerstraße 14, 4694 Ohlsdorf)
5. Optional Live-Vorschau: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

### 🔜 Als Nächstes – von mir
- App-Icon aus deinem Logo in allen Größen erzeugen (sobald `icon-source.png` da ist)
- Screenshots aus dem Simulator erzeugen
- Finale Kontrolle vor dem Archive
- Optional: kleine Admin-Ansicht für eingegangene Meldungen
