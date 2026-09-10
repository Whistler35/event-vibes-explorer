# EVENDLE → App Store: Komplett-Ablauf zum Einreichen

**Ziel:** heute alles fertig machen und **„Für Prüfung einreichen"** klicken – inkl. Push.
Reihenfolge einhalten. Jeder Schritt sagt dir **wo** du bist und **was** rein muss (copy-paste).
Geschätzte Zeit: **45–70 Min** (davon ~15 Min Screenshots).

Zwei Browser-Tabs offen halten:
- **App Store Connect:** https://appstoreconnect.apple.com → „Meine Apps" → **EVENDLE**
- **Apple Developer:** https://developer.apple.com/account
- Dazu **Lovable** (Projekt „Evendle" → „More" → **Cloud**)

---

## TEIL A — Push / APNs fertig machen (~15 Min)

> Kein neuer Build nötig – Build 1.0 (2) hat Push-Entitlement + Plugin schon drin.

### A1. Prüfen: Push-Capability an der App-ID
1. developer.apple.com → **Certificates, Identifiers & Profiles** → **Identifiers**
2. **`com.evendle.app`** anklicken
3. Liste durchsehen: bei **Push Notifications** muss der Haken gesetzt sein.
   - Falls nicht: Haken setzen → **Save**.

### A2. APNs Auth Key erzeugen (einmalig)
1. Gleiche Seite → links **Keys** → blaues **+**
2. **Key Name:** `EVENDLE APNs`
3. Haken bei **Apple Push Notifications service (APNs)** → **Continue** → **Register**
4. **Download** → du bekommst eine Datei `AuthKey_XXXXXXXXXX.p8`
   → **Gut aufheben, lässt sich nur EINMAL herunterladen.**
5. Auf der Seite steht die **Key ID** (10 Zeichen, z. B. `AB12CD34EF`) → notieren.

### A3. Die 5 Secrets in Lovable Cloud eintragen
Lovable → Evendle → **More → Cloud → Secrets** → jeweils **+ Add secret**:

| Name (exakt) | Wert |
|---|---|
| `APNS_KEY_ID` | die Key ID aus A2 (10 Zeichen) |
| `APNS_TEAM_ID` | `7DY4J52V8L` |
| `APNS_BUNDLE_ID` | `com.evendle.app` |
| `APNS_HOST` | `api.push.apple.com` |
| `APNS_PRIVATE_KEY` | **kompletter Inhalt** der `.p8`-Datei |

Für `APNS_PRIVATE_KEY`: die `.p8` mit **TextEdit** öffnen (Rechtsklick → „Öffnen mit" → TextEdit) und **alles** kopieren, inklusive der Zeilen:
```
-----BEGIN PRIVATE KEY-----
…mehrere Zeilen…
-----END PRIVATE KEY-----
```

### A4. Edge Function neu deployen
Lovable-Chat (im Projekt Evendle) – das hier reinpasten:
```
Redeploy the edge function "send-push-notification" so it picks up the new
secrets APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_HOST and
APNS_PRIVATE_KEY. Do not change any code. Confirm when the deploy is live.
```

### A5. Später testen (kein Blocker)
Sobald Build 1.0 (2) in TestFlight installierbar ist: App aufs iPhone, einloggen,
Push-Erlaubnis geben, mit 2. Gerät/Account eine Nachricht schicken → Push muss kommen.
Kommt keine → im Runbook unten „Fehlerbehebung → Push" schauen. **Blockiert die Einreichung nicht.**

---

## TEIL B — Demo-Account für die Apple-Prüfer (~3 Min)

Apple braucht einen fertigen Login. Am einfachsten normal in der App anlegen:

1. **evendle.com** (oder TestFlight-App) → Registrieren
2. E-Mail: **`benjamin+applereview@evendle.com`**  ·  Passwort: **`EvendleReview2026!`**
3. Bestätigungsmail kommt in dein normales Postfach → Link klicken
4. Onboarding durchklicken: Vorname „Apple", ein paar Interessen wählen, Foto **überspringen**, Standort **erlauben**
5. Fertig. Diese Zugangsdaten trägst du in Teil F ein.

> Notiere dir: **benjamin+applereview@evendle.com / EvendleReview2026!**

### B2. (Optional, empfohlen) Damit die Prüfer nicht auf einen leeren „Entdecken"-Feed schauen
Die Prüfer sitzen in Kalifornien – ohne aktive Blitze in der Nähe ist der Feed leer.
Optionales Seed über Lovable → **Cloud → SQL editor**:

```sql
-- 1) eigene user_id holen
select id, email from auth.users where email like 'benjamin%';
```
Die `id` von **benjamin+applereview@evendle.com** kopieren, unten bei `:HOST` einsetzen und ausführen:
```sql
insert into public.blitz_requests (host_id, activity, duration_minutes, city, latitude, longitude, expires_at, status)
values
  (':HOST', 'Kaffee & Leute treffen', 120, 'Cupertino', 37.3349, -122.0090, now() + interval '30 days', 'active'),
  (':HOST', 'Spaziergang am Nachmittag', 120, 'Cupertino', 37.3320, -122.0300, now() + interval '30 days', 'active'),
  (':HOST', 'Abends auf ein Bier',      180, 'Cupertino', 37.3230, -122.0322, now() + interval '30 days', 'active');
```
(Nach dem Launch kannst du die 3 Zeilen wieder löschen – oder einfach ablaufen lassen.)

---

## TEIL C — App Store Connect: „App-Informationen" (gilt für alle Versionen)

**Meine Apps → EVENDLE → links „App-Informationen"**

### C1. Lokalisierbare Infos (Deutsch)
| Feld | Wert |
|---|---|
| Name | `EVENDLE` |
| Untertitel | `Spontan Leute treffen, jetzt` |

### C2. Allgemein
| Feld | Wert |
|---|---|
| Bundle-ID | `com.evendle.app` (schon gesetzt) |
| Primäre Sprache | `Deutsch` |
| Kategorie – Primär | **Soziale Netzwerke** |
| Kategorie – Sekundär | **Lifestyle** |
| Content-Rechte: enthält die App Inhalte Dritter? | **Nein** |

### C3. Altersfreigabe
Bei „Altersfreigabe" auf **Bearbeiten** → Fragebogen:

| Frage | Antwort |
|---|---|
| Gewalt (Cartoon/Fantasy/realistisch) | Nein / Keine |
| Längere realistische Gewalt | Nein |
| Schreck-/Horrorthemen | Nein |
| Sexueller Content / Nacktheit | Nein |
| Anzügliche Inhalte / vulgärer Humor | Nein |
| Alkohol, Tabak, Drogen | Nein |
| Simuliertes Glücksspiel | Nein |
| Kontodaten / medizinische Infos | Nein |
| **Uneingeschränkter Internet-Zugriff** | **Nein** |
| **Benutzergenerierte Inhalte** | **Ja** |
| → Können Nutzer Inhalte/Nutzer melden? | **Ja** |
| → Können Nutzer andere blockieren? | **Ja** |
| → Moderierst du Inhalte? | **Ja** |
| Häufigkeit anzüglicher / freizügiger Themen | Nein / Nie |

→ Ergebnis bestätigen (**12+** erwartet). **Speichern**.

---

## TEIL D — App Store Connect: Version „1.0"

**Meine Apps → EVENDLE → links „1.0 Vorbereitung für die Einreichung"**

### D1. Werbetext (Promotional Text)
```
Lust auf jetzt? Schick einen Blitz und triff in Minuten Leute in deiner Nähe, die spontan dasselbe vorhaben. Weniger planen, mehr erleben. Kostenlos, ohne Werbung.
```

### D2. Beschreibung
```
EVENDLE ist die App für alles, worauf du JETZT GERADE Lust hast.

Kaffee? Eine Runde laufen? Spontan auf ein Bier, ins Kino, an den See? Statt tagelang zu planen oder im Gruppenchat zu versanden, schickst du einen Blitz – und findest in Minuten Leute in deiner Nähe, die genau darauf auch Lust haben.

SO FUNKTIONIERT'S
1. Blitz senden: Sag, was du vorhast und wie lange du Zeit hast.
2. Leute finden: Andere in deiner Nähe sehen deinen Blitz und fragen an – oder du entdeckst ihre und wischst nach rechts.
3. Huddle: Wenn es passt, landet ihr automatisch in einem gemeinsamen Chat. Kurz abstimmen, losziehen.
4. Danach ist der Chat vorbei – es geht ums echte Treffen, nicht ums Schreiben.

WARUM EVENDLE
• Für den Moment gemacht – keine Terminplanung Wochen im Voraus
• Weniger Scrollen, mehr erleben – die App bringt dich raus, nicht ans Handy
• Mit Freunden bist du sofort im Huddle, ganz ohne Anfrage
• Kostenlos und ohne Werbung
• Kein Verkauf deiner Daten, keine Tracking-SDKs
• Anmeldung mit Apple oder Google in Sekunden
• Standort nur, wenn du Blitz aktiv nutzt – andere sehen nur die ungefähre Entfernung, nie deine genaue Position

EVENDLE ist für alle, die das Gefühl kennen: „Ich hätte jetzt Lust auf was – aber mit wem?"

Fragen oder Feedback? Schreib uns an benjamin@evendle.com
```

### D3. Schlüsselwörter
```
blitz,spontan,treffen,leute,aktivität,ausgehen,freunde,kennenlernen,nähe,gemeinsam,offline,jetzt
```

### D4. URLs
| Feld | Wert |
|---|---|
| Support-URL | `https://www.evendle.com` |
| Marketing-URL | `https://www.evendle.com` |

### D5. Copyright (weiter unten unter „Allgemeine App-Informationen")
```
2026 Benjamin Maxwald
```

### D6. Screenshots (Abschnitt „App-Vorschau und Screenshots")
- Brauchst **mind. 1**, besser **3–5**, Größe **iPhone 6.7″ (1290 × 2796)** oder **6.9″ (1320 × 2868)**.
- **Dein iPhone 16 macht 1179 × 2556** – gleiches Seitenverhältnis, aber zu klein.
  → Nimm die Screenshots normal auf, **schick sie mir**, ich skaliere sie exakt auf 1290 × 2796 und geb sie dir zurück. Dann hier hochladen.
- Shotlist siehe **Anhang** unten.

### D7. Build auswählen
- Abschnitt **„Build"** → **+** → **Build 1.0 (2)** wählen.
  (Wenn er noch „Processing" ist: 15–30 Min warten, Seite neu laden.)

### D8. „Neuigkeiten in dieser Version"
Für die **erste** Version optional. Falls Pflicht:
```
Erste Version von EVENDLE. Schick einen Blitz und triff spontan Leute in deiner Nähe.
```

---

## TEIL E — App-Datenschutz (links „App-Datenschutz" → Bearbeiten)

Datenschutzrichtlinien-URL:
```
https://www.evendle.com/datenschutz.html
```

**„Erfasst diese App Daten?" → Ja.** Dann folgende Datentypen hinzufügen. Für **alle** gilt:
- **Verwendungszweck:** „App-Funktionalität"
- **Mit Identität des Nutzers verknüpft:** **Ja**
- **Für Tracking verwendet:** **NEIN** (bei allen)

| Datentyp (in Apples Liste) | Auswählen |
|---|---|
| Kontaktinfos → **E-Mail-Adresse** | ✅ |
| Kontaktinfos → **Name** | ✅ |
| Benutzerinhalte → **Fotos oder Videos** | ✅ (Profilbild) |
| Benutzerinhalte → **Andere Benutzerinhalte** | ✅ (Chat-Nachrichten, Bio) |
| Kennungen → **Benutzer-ID** | ✅ |
| Standort → **Ungefährer Standort** | ✅ (Blitz-Umkreis) |
| Nutzungsdaten → **Produktinteraktion** | ✅ → hier **„Mit Identität verknüpft: Nein"**, Zweck **„Analyse"**, Tracking **Nein** |

Alles andere (Finanzdaten, Gesundheit, Standort *präzise*, Kontakte, Browserverlauf, Such­verlauf, Diagnose, Werbedaten) → **nicht** ankreuzen.

**Speichern & veröffentlichen.**

---

## TEIL F — Prüfungsinformationen (in „1.0", Abschnitt „App-Prüfungsinformationen")

### F1. Anmeldung erforderlich → **Ja**
| Feld | Wert |
|---|---|
| Benutzername | `benjamin+applereview@evendle.com` |
| Passwort | `EvendleReview2026!` |

### F2. Kontakt
| Feld | Wert |
|---|---|
| Vorname / Nachname | Benjamin / Maxwald |
| Telefon | (deine Nummer) |
| E-Mail | `benjamin@evendle.com` |

### F3. Anmerkungen (Notes) – das hier reinpasten:
```
EVENDLE is a spontaneous-meetup app ("Blitz"). A user starts an activity they
feel like doing right now; nearby users who want the same join a shared, time-
limited group chat ("Huddle") and meet in person. There is no event catalogue
and no dating feature.

HOW TO REVIEW THE CORE LOOP
1. Log in with the demo account above. Allow location and notifications.
2. Tab "Blitz" → "Mein Blitz" → tap the green card → create a Blitz
   (choose any activity, set duration) → it shows as your active Blitz.
3. Tab "Blitz" → "Entdecken" → swipe right on a Blitz to request to join.
   (We seeded a few demo Blitzes near Cupertino so this list is not empty.)
4. When a request is accepted, both users land in a Huddle in the "Chat" tab.

SAFETY / GUIDELINE 1.2 FEATURES
- Report & Block: open any user's profile (e.g. via friend search in
  onboarding, or a chat partner) → "..." menu top right → "Blockieren" /
  "Melden".
- In-app account deletion: tab "Profil" → "Bearbeiten" → scroll down →
  "Konto löschen" (type LÖSCHEN to confirm). This permanently deletes the
  account and data.
- Terms/EULA, privacy policy and imprint: https://www.evendle.com/agb.html ,
  /datenschutz.html , /impressum.html (also linked inside the app under
  Profil → Bearbeiten).
- Moderation: reports are reviewed by us; contact benjamin@evendle.com.

Web login (Google) also works at https://www.evendle.com if you prefer.
```

---

## TEIL G — Preise und Verfügbarkeit (links „Preise und Verfügbarkeit")

| Feld | Wert |
|---|---|
| Preis | **Kostenlos** (Tier 0) |
| Verfügbarkeit | **Alle Länder und Regionen** |
| (kein In-App-Kauf) | – |

---

## TEIL H — Einreichen

1. Zurück auf **„1.0 Vorbereitung für die Einreichung"**
2. Oben rechts **„Zur Prüfung hinzufügen"** / **„Für Prüfung einreichen"**
3. **Exportbestimmungen:** Es kommt evtl. KEINE Frage (in der App ist `ITSAppUsesNonExemptEncryption = false` gesetzt). Falls doch: „Verwendet deine App Verschlüsselung?" → **Nein** (nur Standard-HTTPS).
4. **Werbe-ID (IDFA):** „Nein".
5. **Absenden.**

Status wechselt auf **„Warten auf Prüfung"**. Prüfung dauert i. d. R. **24–48 h**.
Du bekommst E-Mails bei Statuswechsel („In Prüfung", „Abgelehnt" + Grund, oder „Bereit für Verkauf").

---

## ANHANG 1 — Screenshot-Shotlist (auf dem iPhone 16 aufnehmen)

Mit dem Demo-Account (oder deinem normalen), Seitentaste + Leiser gleichzeitig:

1. **Blitz erstellen** – Tab „Blitz" → „Mein Blitz" → die große grüne Karte „bitte kurz testen"-artig, aber mit sinnvollem Text („Kaffee & Leute treffen")
2. **Entdecken** – Tab „Blitz" → „Entdecken" → das Swipe-Deck mit einem Blitz-Kärtchen
3. **Match-Moment** – nachdem ein Match zustande kam (der „⚡ MATCH"-Screen) – oder alternativ ein aktiver Huddle in der Liste
4. **Huddle-Chat** – ein Chat mit ein paar Nachrichten drin
5. **Profil** – dein Profil mit Foto + Interessen

Schick mir die 5 Bilder → ich mach exakt 1290 × 2796 draus und geb sie dir zurück zum Hochladen.
(Keine Event-Screens.)

---

## ANHANG 2 — Fehlerbehebung

**Build 1.0 (2) taucht nicht auf / „Processing"**
→ 15–45 Min nach Upload normal. Seite neu laden. Wenn nach >2 h noch weg:
E-Mail von Apple checken (evtl. „Missing Compliance" oder Entitlement-Hinweis).

**Beim Einreichen: „Missing Compliance"**
→ Bei der Frage zur Verschlüsselung **Nein** wählen (siehe Teil H.3).

**Push kommt in TestFlight nicht an**
→ Zuerst prüfen: Hast du in der App die Benachrichtigungs-Erlaubnis gegeben?
→ In Lovable → Cloud → **Logs** nach „apns" / „send-push" filtern, Fehlermeldung ansehen.
→ Häufig: `APNS_PRIVATE_KEY` unvollständig kopiert (die `BEGIN/END`-Zeilen müssen dabei sein).
→ Falls „BadDeviceToken": testweise `APNS_HOST` auf `api.sandbox.push.apple.com` ändern,
   Edge Function nochmal deployen, erneut testen. (Für den finalen App-Store-Release wieder
   `api.push.apple.com`.) **Blockiert die Einreichung nicht** – kann auch als Update v1.1 kommen.

**Apple lehnt wegen „leerer Feed" / Guideline 2.1 ab**
→ Das Cupertino-Seed aus Teil B2 einspielen und erneut einreichen; in den Notes steht
   der Hinweis schon drin.

**Apple lehnt wegen Guideline 5.1.1(v) (Kontolöschung) ab**
→ In den Review-Notes (Teil F3) ist der genaue Pfad beschrieben; ggf. als Antwort im
   Resolution Center denselben Text nochmal schicken.
