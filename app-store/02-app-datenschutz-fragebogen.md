# App Store Connect – „App-Datenschutz" Fragebogen (App Privacy)

> Ort: **App Store Connect → EVENDLE → App-Datenschutz → Bearbeiten**.
> Apple fragt pro Datenart: Wird sie erfasst? Wofür? Ist sie mit der Identität verknüpft? Wird damit „getrackt"?
> Für EVENDLE gilt durchgehend: **kein Tracking, keine Werbung, keine Datenweitergabe an Datenhändler.**

## Grundsatzfragen

| Frage | Antwort |
|-------|---------|
| Erfasst diese App Daten? | **Ja** |
| Werden Daten zum Tracking über Apps/Websites anderer Firmen hinweg genutzt? | **Nein** |

## Zu deklarierende Datenarten

### 1. Kontaktdaten → E-Mail-Adresse
- Erfasst: **Ja**
- Zwecke: **App-Funktionalität**, **Kontoverwaltung**
- Mit Identität verknüpft: **Ja**
- Zum Tracking genutzt: **Nein**

### 2. Kontaktdaten → Name
- Erfasst: **Ja** (Anzeigename im Profil)
- Zwecke: **App-Funktionalität**
- Mit Identität verknüpft: **Ja**
- Tracking: **Nein**

### 3. Benutzerinhalte → Fotos oder Videos
- Erfasst: **Ja** (Profilfoto, optional)
- Zwecke: **App-Funktionalität**
- Verknüpft: **Ja**
- Tracking: **Nein**

### 4. Benutzerinhalte → Andere Benutzerinhalte
- Erfasst: **Ja** (Nachrichten/Chat, Profilangaben, „Blitz"-Beiträge)
- Zwecke: **App-Funktionalität**
- Verknüpft: **Ja**
- Tracking: **Nein**

### 5. Standort → Genauer Standort
- Erfasst: **Ja** (nur bei aktiver Nutzung von „Blitz")
- Zwecke: **App-Funktionalität**
- Verknüpft: **Ja**
- Tracking: **Nein**

> Falls du sicher bist, dass nur grob gerundete Koordinaten gespeichert werden, kannst du stattdessen
> **„Ungefährer Standort"** wählen. Im Zweifel „Genauer Standort" angeben (konservativer, kein Nachteil im Review).

### 6. Kennungen → Benutzer-ID
- Erfasst: **Ja** (Konto-ID aus Supabase)
- Zwecke: **App-Funktionalität**
- Verknüpft: **Ja**
- Tracking: **Nein**

### NICHT zu deklarieren (weil nicht genutzt)
- Gerätekennung / Werbe-ID (IDFA) – **wird nicht verwendet**
- Nutzungsdaten / Produktinteraktion / Analytics – **kein Analyse-SDK eingebunden**
- Diagnose/Absturzdaten durch Dritt-SDK – **keine** (Apples eigene, anonyme Absturzberichte zählen nicht)
- Zahlungsdaten – **keine** (App ist kostenlos, kein In-App-Kauf)
- Kontakte / Adressbuch – **kein Zugriff**
- Browserverlauf, Suchverlauf – **nein**

> Server-Logs des Hosters/Supabase enthalten technisch die IP-Adresse zur Betriebssicherheit. Das ist
> Auftragsverarbeitung zum sicheren Betrieb und wird im App-Privacy-Fragebogen üblicherweise **nicht**
> als eigene „erfasste Datenart" deklariert. In der Datenschutzerklärung ist es transparent genannt.
