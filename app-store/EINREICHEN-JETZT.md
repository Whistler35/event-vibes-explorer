# EVENDLE → App Store: Jetzt wirklich einreichen (Stand 29.09.2026, Build 1.3 (24))

Das meiste ist aus der Vorbereitung vom 09./10.09. schon fertig (Texte, Datenschutz-Antworten, Screenshots liegen bereit). Das hier ist die aktualisierte, komplette Reihenfolge für **Build 1.3 (24)**. Alles zum Copy-Pasten ist als Codeblock markiert.

Zwei Browser-Tabs offen halten:
- **App Store Connect:** https://appstoreconnect.apple.com → „Meine Apps" → **EVENDLE**
- **Lovable** (Projekt „Evendle" → „More" → **Cloud**) — falls du nochmal was in der DB nachsehen musst

---

## Vorab-Check: Demo-Account für die Prüfer

Falls du den hier schon mal angelegt hast (E-Mail `benjamin+applereview@evendle.com`), logg dich kurz damit ein und prüf, dass er noch funktioniert — seit dem 09.09. hat sich das Onboarding komplett geändert (neue 4-Slide-Story-Intro), das sieht der Account aber nicht nochmal, weil Onboarding nur beim allerersten Login läuft. Das ist kein Problem für die Prüfer, aber falls der Account aus irgendeinem Grund nicht mehr geht, leg ihn einfach neu an:

1. In der App (oder auf app.evendle.com) registrieren
2. E-Mail: `benjamin+applereview@evendle.com` · Passwort: `EvendleReview2026!`
3. Bestätigungsmail in deinem Postfach → Link klicken
4. Onboarding/Story-Intro durchklicken, Profil kurz ausfüllen (Foto kann übersprungen werden), Standort **erlauben**

**Empfehlung, damit die Prüfer nicht auf einen leeren „Entdecken"-Feed schauen**: Lovable → Cloud → SQL editor:

```sql
-- eigene user_id vom Demo-Account holen
select id, email from auth.users where email = 'benjamin+applereview@evendle.com';
```
Die `id` unten bei `:HOST` einsetzen und ausführen:
```sql
insert into public.blitz_requests (host_id, activity, duration_minutes, city, latitude, longitude, expires_at, status)
values
  (':HOST', 'Kaffee & Leute treffen', 120, 'Cupertino', 37.3349, -122.0090, now() + interval '30 days', 'active'),
  (':HOST', 'Spaziergang am Nachmittag', 120, 'Cupertino', 37.3320, -122.0300, now() + interval '30 days', 'active'),
  (':HOST', 'Abends auf ein Bier',      180, 'Cupertino', 37.3230, -122.0322, now() + interval '30 days', 'active');
```
(Nach dem Review kannst du die 3 Zeilen wieder löschen — sie laufen nach 30 Tagen von selbst ab.)

---

## TEIL A — App-Informationen (App Store Connect → EVENDLE → „App-Informationen")

### A1. Lokalisierbare Infos (Deutsch)
| Feld | Wert |
|---|---|
| Name | `EVENDLE` |
| Untertitel | `Spontan Leute treffen, jetzt` |

### A2. Allgemein
| Feld | Wert |
|---|---|
| Bundle-ID | `com.evendle.app` (schon gesetzt) |
| Primäre Sprache | `Deutsch` |
| Kategorie – Primär | **Soziale Netzwerke** |
| Kategorie – Sekundär | **Lifestyle** |
| Content-Rechte: enthält die App Inhalte Dritter? | **Nein** |

### A3. Altersfreigabe
Falls Apples Fragebogen inzwischen anders aussieht als hier beschrieben (Apple hat diesen Screen 2024/25 mal überarbeitet) — sinngemäß dieselben Antworten, einfach nach den passenden neuen Kategorien suchen:

| Frage | Antwort |
|---|---|
| Gewalt, Horror, sexueller Content, vulgärer Humor, Alkohol/Tabak/Drogen, Glücksspiel | überall **Nein** |
| **Uneingeschränkter Internet-Zugriff** | **Nein** |
| **Benutzergenerierte Inhalte** | **Ja** |
| → Nutzer können Inhalte/Nutzer melden | **Ja** |
| → Nutzer können andere blockieren | **Ja** |
| → Inhalte werden moderiert | **Ja** |

→ Ergebnis **12+** erwartet. **Speichern**.

---

## TEIL B — Version „1.3" vorbereiten

**EVENDLE → links „1.3 Vorbereitung für die Einreichung"** (falls die Version noch nicht existiert: „+ Version oder Plattform" → iOS → `1.3`)

### B1. Werbetext (Promotional Text)
```
Lust auf jetzt? Schick einen Blitz und triff in Minuten Leute in deiner Nähe, die spontan dasselbe vorhaben. Weniger planen, mehr erleben. Kostenlos, ohne Werbung.
```

### B2. Beschreibung
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
• Halte fest, was ihr erlebt habt – eure eigene kleine Sammlung an Blitz-Momenten
• Kostenlos und ohne Werbung
• Kein Verkauf deiner Daten, keine Tracking-SDKs
• Anmeldung mit Apple oder Google in Sekunden
• Standort nur, wenn du Blitz aktiv nutzt – andere sehen nur die ungefähre Entfernung, nie deine genaue Position

EVENDLE ist für alle, die das Gefühl kennen: „Ich hätte jetzt Lust auf was – aber mit wem?"

Fragen oder Feedback? Schreib uns an benjamin@evendle.com
```

### B3. Schlüsselwörter
```
blitz,spontan,treffen,leute,aktivität,ausgehen,freunde,kennenlernen,nähe,gemeinsam,offline,jetzt
```

### B4. URLs
| Feld | Wert |
|---|---|
| Support-URL | `https://www.evendle.com` |
| Marketing-URL | `https://www.evendle.com` |

### B5. Copyright
```
2026 Benjamin Maxwald
```

### B6. Screenshots
**Schon fertig und in der richtigen Größe** — liegen im Repo unter `app-store/screenshots/` (1320 × 2868 px, genau Apples 6.9″-Pflichtformat):
- `01-mein-blitz.png`
- `02-profil.png`
- `03-entdecken.png`
- `04-huddle-chat.png`

Einfach im Abschnitt „App-Vorschau und Screenshots" hochladen. Sie sind vom 12.09. — zeigen also noch nicht die neuesten Sachen von heute (Streak-Anzeige, "Freunde" statt "Blitz-Community" etc.), das ist aber kein Einreichungs-Blocker. Wenn du willst, können wir die später mal auffrischen; für die Einreichung reichen sie so.

### B7. Build auswählen
Abschnitt **„Build"** → **+** → **Build 1.3 (24)** wählen (falls „Processing": 15–30 Min warten, Seite neu laden).

### B8. „Neuigkeiten in dieser Version"
Da das die erste tatsächliche Einreichung ist, optional — falls Pflicht:
```
Erste Version von EVENDLE. Schick einen Blitz und triff spontan Leute in deiner Nähe.
```

---

## TEIL C — App-Datenschutz (links „App-Datenschutz" → Bearbeiten)

Datenschutzrichtlinien-URL:
```
https://www.evendle.com/datenschutz.html
```

**„Erfasst diese App Daten?" → Ja.** Für **alle** folgenden Datentypen gilt: Zweck **„App-Funktionalität"**, mit Identität verknüpft **Ja**, für Tracking verwendet **Nein**.

| Datentyp | Auswählen |
|---|---|
| Kontaktinfos → **E-Mail-Adresse** | ✅ |
| Kontaktinfos → **Name** | ✅ |
| Benutzerinhalte → **Fotos oder Videos** | ✅ (Profilbild + Blitz-Feed-Fotos) |
| Benutzerinhalte → **Andere Benutzerinhalte** | ✅ (Chat-Nachrichten, Bio, Feed-Captions) |
| Kennungen → **Benutzer-ID** | ✅ |
| Standort → **Genauer Standort** | ✅ |

Zum Standort: Andere Nutzer sehen immer nur die gerundete Entfernung, aber im Hintergrund speichert EVENDLE die echten Koordinaten (für den Nähe-Radius). Deshalb „Genauer Standort" ankreuzen, nicht „Ungefährer" — konservativer und im Zweifel kein Nachteil im Review.

Alles andere (Finanzdaten, Gesundheit, Kontakte, Browser-/Suchverlauf, Werbedaten, Diagnose) → **nicht** ankreuzen.

**Speichern & veröffentlichen.**

---

## TEIL D — App-Prüfungsinformationen (in Version „1.3", Abschnitt „App-Prüfungsinformationen")

### D1. Anmeldung erforderlich → **Ja**
| Feld | Wert |
|---|---|
| Benutzername | `benjamin+applereview@evendle.com` |
| Passwort | `EvendleReview2026!` |

### D2. Kontakt
| Feld | Wert |
|---|---|
| Vorname / Nachname | Benjamin / Maxwald |
| Telefon | (deine Nummer) |
| E-Mail | `benjamin@evendle.com` |

### D3. Anmerkungen (Notes) — copy-paste:
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
5. Tab "Friends" lets you add/search friends; Tab "Feed" shows shared Blitz
   photos from friends and public posts.

SAFETY / GUIDELINE 1.2 FEATURES
- Report & Block: open any user's profile → "..." menu top right →
  "Blockieren" / "Melden". Reports notify our admin team and can be actioned
  (content/account removal) from an internal admin view.
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

## TEIL E — Preise und Verfügbarkeit

| Feld | Wert |
|---|---|
| Preis | **Kostenlos** (Tier 0) |
| Verfügbarkeit | **Alle Länder und Regionen** |
| In-App-Käufe | keine |

---

## TEIL F — Einreichen

1. Zurück auf **„1.3 Vorbereitung für die Einreichung"**
2. Oben rechts **„Zur Prüfung hinzufügen"** / **„Für Prüfung einreichen"**
3. **Exportbestimmungen**: kommt evtl. gar keine Frage (`ITSAppUsesNonExemptEncryption = false` ist im Code gesetzt). Falls doch: „Verwendet deine App Verschlüsselung?" → **Nein** (nur Standard-HTTPS).
4. **Werbe-ID (IDFA)**: „Nein".
5. **Absenden.**

Status wechselt auf **„Warten auf Prüfung"**. Prüfung dauert i. d. R. **24–48 h**. Du bekommst E-Mails bei Statuswechsel („In Prüfung", „Abgelehnt" + Grund, oder „Bereit für Verkauf").

---

## Fehlerbehebung

**Build 1.3 (24) taucht nicht auf / „Processing"**
→ 15–45 Min nach Upload normal. Seite neu laden. Nach >2 h noch weg: E-Mail von Apple checken.

**„Missing Compliance" beim Einreichen**
→ Bei der Verschlüsselungs-Frage **Nein** wählen (Teil F.3).

**Apple lehnt wegen „leerer Feed" / Guideline 2.1 ab**
→ Das Cupertino-Seed von oben (Vorab-Check) einspielen, falls noch nicht gemacht, erneut einreichen.

**Apple lehnt wegen Guideline 5.1.1(v) (Kontolöschung) ab**
→ In den Review-Notes (Teil D3) steht der genaue Pfad; im Resolution Center denselben Text nochmal schicken.
