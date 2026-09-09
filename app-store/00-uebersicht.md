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

### 🔜 Als Nächstes – von dir
1. **Entscheidung:** Blockieren/Melden/Konto-Löschen – baue ich das im Code, oder Lovable? (`03-review-blocker.md`)
2. Apple-Account-Typ in App Store Connect nachsehen (Individual vs. Firma)
3. Logo als `icon-source.png` in den Projekt-Hauptordner legen
4. `public/datenschutz.html` und `public/agb.html`: grün markierte Platzhalter ausfüllen
5. Optional für Live-Vorschau: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

### 🔜 Als Nächstes – von mir (nach deiner Entscheidung zu Punkt 1)
- Blockieren/Melden/Konto-Löschen umsetzen (falls „ich")
- App-Icon aus deinem Logo in allen Größen erzeugen
- Screenshots aus dem Simulator erzeugen
- Finale Kontrolle vor dem Archive
