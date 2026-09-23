# Google Play Console – „Data Safety"-Formular

> Ort: **Play Console → EVENDLE → App-Inhalte → Datensicherheit**.
> Google fragt pro Datenart: Wird sie erfasst? Wird sie geteilt? Ist sie verschlüsselt übertragen?
> Können Nutzer die Löschung verlangen? Inhaltlich identisch zu Apples App-Privacy-Fragebogen
> (siehe [../app-store/02-app-datenschutz-fragebogen.md](../app-store/02-app-datenschutz-fragebogen.md)),
> nur anders strukturiert.

## Grundsatzfragen

| Frage | Antwort |
|-------|---------|
| Werden Nutzerdaten erfasst oder übertragen? | **Ja** |
| Werden alle erfassten Daten verschlüsselt übertragen (HTTPS/TLS)? | **Ja** (Supabase-API ausschließlich über HTTPS) |
| Bietet die App einen Weg, die Löschung der Daten zu verlangen? | **Ja** – Konto-Löschung direkt in der App (Profil bearbeiten), löscht Account + Daten |
| Werden Daten an Dritte weitergegeben/verkauft? | **Nein** |

## Zu deklarierende Datenkategorien

### Standort → Ungefährer Standort
- Erfasst: **Ja**
- Geteilt mit Dritten: **Nein**
- Zweck: **App-Funktionalität**
- Optional für Nutzer (kann ablehnen)? **Nein** (Kernfunktion „Blitz" braucht Standort, sonst nicht nutzbar)
- Verschlüsselt übertragen: **Ja**

> Genau wie bei Apple: Andere Nutzer sehen nur die ungefähre Distanz, nie exakte Koordinaten.

### Persönliche Daten → E-Mail-Adresse
- Erfasst: **Ja**
- Geteilt: **Nein**
- Zweck: **Kontoverwaltung, App-Funktionalität**
- Optional: **Nein** (Registrierung erfordert E-Mail)
- Verschlüsselt: **Ja**

### Persönliche Daten → Name
- Erfasst: **Ja** (Anzeigename)
- Geteilt: **Nein**
- Zweck: **App-Funktionalität**
- Optional: **Nein**
- Verschlüsselt: **Ja**

### Fotos und Videos
- Erfasst: **Ja** (Profilfoto, Feed-Fotos – optional außer Profilfoto)
- Geteilt: **Nein**
- Zweck: **App-Funktionalität**
- Optional: **Teilweise** (Profilfoto empfohlen, Feed-Fotos optional)
- Verschlüsselt: **Ja**

### Nachrichten → In-App-Nachrichten
- Erfasst: **Ja** (Chat-/Huddle-Nachrichten)
- Geteilt: **Nein**
- Zweck: **App-Funktionalität**
- Optional: **Nein**
- Verschlüsselt: **Ja**

### App-Aktivität → App-Interaktionen
- Erfasst: **Ja** (Blitz-Erstellung, Huddle-Teilnahme, Feed-Posts/Likes/Kommentare)
- Geteilt: **Nein**
- Zweck: **App-Funktionalität**
- Optional: **Nein**
- Verschlüsselt: **Ja**

### Geräte- oder andere IDs
- Erfasst: **Ja** (Konto-ID aus Supabase, Push-Token für Benachrichtigungen)
- Geteilt: **Nein** (Push-Token geht nur an Firebase Cloud Messaging zur Zustellung, nicht an weitere Dritte)
- Zweck: **App-Funktionalität**
- Optional: **Nein** (ID), **Ja** (Push-Token, wenn Benachrichtigungen abgelehnt werden)
- Verschlüsselt: **Ja**

### NICHT zu deklarieren (weil nicht genutzt)
- Finanz-/Zahlungsdaten – **keine** (App kostenlos, kein In-App-Kauf)
- Gesundheitsdaten – **keine**
- Web-Browsing-Verlauf – **keine**
- Suchverlauf – **keine**
- Kontakte/Adressbuch – **kein Zugriff**
- Werbe-ID – **nicht verwendet, kein Ads-SDK**
- Analytics-/Tracking-SDKs Dritter – **keine** (eigene, einfache `analytics_events`-Tabelle in der eigenen DB, nicht an Dritte weitergegeben, kein Fingerprinting)

## Sicherheitspraktiken (separates Kapitel im Formular)

| Frage | Antwort |
|-------|---------|
| Daten während der Übertragung verschlüsselt? | **Ja** |
| Nutzer können Datenlöschung verlangen? | **Ja** |
| Unabhängige Sicherheitsprüfung? | **Nein** (kleine App, keine externe Zertifizierung) |

---

## Unterschied zu Apple, den man im Kopf behalten sollte

Google verlangt **zusätzlich** eine Angabe, ob jede Datenart für den Nutzer **optional** ist (kann er die
Erfassung ablehnen und die App trotzdem nutzen?). Bei EVENDLE ist das bei den meisten Kern-Datentypen
**Nein** (Standort, E-Mail, Name, Nachrichten sind für die Kernfunktion zwingend) – das ist normal und
kein Ablehnungsgrund, muss aber ehrlich so angegeben werden, sonst reibt es sich beim Review.
