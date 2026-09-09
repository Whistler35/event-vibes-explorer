# EVENDLE → App Store: Übersicht & Fortschritt

| Datei | Inhalt |
|-------|--------|
| `00-uebersicht.md` | dieses Dokument – **hier startest du** |
| `01-listing-texte.md` | Store-Texte (Name, Beschreibung, Keywords, Kategorien, Altersfreigabe) – zum Kopieren |
| `02-app-datenschutz-fragebogen.md` | Vorausgefüllte Antworten für Apples „App-Datenschutz"-Fragebogen |
| `03-review-blocker.md` | (erledigt) Apple-Pflichtfunktionen – jetzt alle gebaut |
| `04-xcode-schritte.md` | Xcode signieren + Archive + Upload (erledigt für Build 1) |
| `05-pflicht-funktionen-anwenden.md` | Blockieren/Melden/Löschen: DB-SQL + Testanleitung |
| `06-oauth-und-push-status.md` | Google/Apple-Login + Push: Status + To-dos **P1–P5** |
| `07-screenshots.md` | Screenshot-Größen + was zu zeigen ist |
| `08-offene-fragen.md` | Offene Punkte an dich/Jakob (**B1–B5**, C, D, P1–P5) |

---

## Wo wir stehen (Stand 09.09.2026, 22 Uhr)

### ✅ Fertig
- Code aktuell, Abhängigkeiten gefixt, alles auf GitHub (`main`, Commit `2f9edd5`)
- Pflichtfunktionen **Blockieren / Melden / Konto löschen** – gebaut + DB-Migration eingespielt
- Registrierung: **nur noch normale User** (kein „Professional Host" mehr)
- Security-Fix: Telefonnummern nicht mehr für alle lesbar
- App-Icon, Datenschutz + AGB + Impressum (echte Daten), In-App-Links
- **iOS-Push:** Sende-Code gebaut, Push-Capability + Entitlement im Build
- **Xcode:** Signing eingerichtet (Team `7DY4J52V8L`), **Build 1.0 (1) archiviert + zu App Store Connect hochgeladen**
- App-Eintrag „EVENDLE" in App Store Connect angelegt (von Xcode)

### 🔲 Offen bis zur Einreichung

| # | Was | Wer | Datei |
|---|-----|-----|-------|
| 1 | **App Store Connect ausfüllen** (Beschreibung, Keywords, Datenschutz-Fragebogen, Altersfreigabe, Preise) | du (Texte fertig) | `01`, `02` |
| 2 | **Screenshots** vom iPhone (echte, gefüllte Screens) | du | `07` |
| 3 | **Datenschutz-Seite live auf evendle.com** – läuft auf **Netlify** (nicht Lovable!), zeigt alten Build. Deploy klären. | du/Jakob | – |
| 4 | **Push fertig P1–P5**: APNs-Key erstellen · App-ID-Capability · Xcode-Capability (erledigt) · Supabase-Secrets · Edge-Function neu deployen | du (P1–P3) + Jakob (P4–P5) | `06` |
| 5 | **OAuth-Konsolen prüfen B1–B3** (Google Cloud Redirect-URI, Supabase Redirect-URLs, Apple Client-IDs) + **B4** (VAPID-Secret) + **B5** (Supabase-Region) | Jakob | `08` |
| 6 | **Web-Login testen (C)** auf evendle.com | du | `08` |
| 7 | **Demo-Account (D)** für Apple-Prüfer – Claude gibt SQL für Lovable | du | `08` |
| 8 | **TestFlight-Test** am iPhone: Login + Push wirklich prüfen | du | – |
| 9 | Vor dem finalen Build: `IPHONEOS_DEPLOYMENT_TARGET` 14 → 15 + `pod install` + neu archivieren (nur eine Warnung, bis Frühjahr 2027 Zeit) | Claude + du | – |
| 10 | **„Für Prüfung einreichen"** klicken | du | – |

### Build-Status prüfen
App Store Connect → App **EVENDLE** → Tab **TestFlight**: wenn Build 1 **nicht mehr „Processing"** zeigt, ist er fertig verarbeitet und lässt sich der Version 1.0 zuordnen. (Dauert 15–60 Min nach Upload – morgen längst fertig.)

### 🔜 Optional / später – von Claude
- „Mark-only" App-Icon, sobald du das Symbol einzeln lieferst
- Kleine Admin-Ansicht für eingegangene Meldungen
