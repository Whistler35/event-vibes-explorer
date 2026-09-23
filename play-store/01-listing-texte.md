# Google Play Console – Texte zum Kopieren

> Sprache primär: **Deutsch (DE)**. Englische Version später (Play Console erlaubt mehrere Sprachen parallel).
> Ort: **Play Console → EVENDLE → Store-Präsenz → Hauptdaten der Store-Eintragung**.
>
> Gleiche Positionierung wie im App Store (siehe [../app-store/01-listing-texte.md](../app-store/01-listing-texte.md)):
> EVENDLE ist **kein** Event-Verzeichnis und **keine** Dating-App, sondern spontanes „Blitzen" –
> jetzt gerade eine Aktivität anstoßen und Menschen in der Nähe finden, die dasselbe vorhaben.
> Motto: **„be offline."**

---

## App-Name (max. 30 Zeichen)

```
EVENDLE
```

## Kurze Beschreibung / Short description (max. 80 Zeichen)

```
Spontan Leute treffen, jetzt – Blitz senden, in Minuten losziehen.
```
(67 Zeichen)

## Vollständige Beschreibung / Full description (max. 4000 Zeichen)

Gleicher Text wie im App Store, 1:1 übernehmbar:

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
• Anmeldung mit Google in Sekunden
• Standort nur, wenn du Blitz aktiv nutzt – andere sehen nur die ungefähre Entfernung, nie deine genaue Position

EVENDLE ist für alle, die das Gefühl kennen: „Ich hätte jetzt Lust auf was – aber mit wem?"

Fragen oder Feedback? Schreib uns an benjamin@evendle.com
```

> Unterschied zum App-Store-Text: „Anmeldung mit Apple oder Google" → nur **„Anmeldung mit Google"**,
> da Sign in with Apple auf Android vorerst ausgeblendet ist (siehe [[project_evendle]]).

## App-Symbol / Icon

512×512 px, 32-Bit-PNG, kein Alpha-Kanal nötig laut Google (wird aber toleriert). Aus dem bestehenden
1024×1024-Icon (`resources/icon.png`) einfach auf 512×512 herunterskalieren.

## Grafik-Anforderungen (anders als iOS!)

| Asset | Maße | Pflicht? |
|-------|------|----------|
| App-Icon | 512×512 px | Ja |
| Feature-Grafik | 1024×500 px | Ja (Banner oben auf der Store-Seite) |
| Telefon-Screenshots | min. 2, empfohlen 4–8 – beliebiges Seitenverhältnis zw. 16:9 und 9:16, min. 320px Kante | Ja |
| Tablet-Screenshots | optional | Nein |

Die Feature-Grafik (1024×500) existiert noch nicht – braucht ein eigenes kleines Design (Wortmarke +
Slogan „be offline." auf grünem Grund, passend zum Look der App). Kann ich vorbereiten, sobald wir
so weit sind.

## Kategorie

| Feld | Wert |
|------|------|
| App-Kategorie | **Soziale Netzwerke** (Social) |
| Tags (optional, bis zu 5) | Freunde treffen, Spontan, Aktivitäten, Nähe, Community |

## Kontaktangaben

| Feld | Wert |
|------|------|
| E-Mail (Pflicht, öffentlich sichtbar) | `benjamin@evendle.com` |
| Website (optional) | `https://www.evendle.com` |
| Telefon (optional) | leer lassen |

## Datenschutzerklärung-URL (Pflicht)

```
https://www.evendle.com/datenschutz.html
```

## Zielgruppe & Inhalt

Google verlangt eine explizite **Zielgruppen-Altersauswahl** (anders als Apples reine Rating-Frage):

| Frage | Antwort |
|-------|---------|
| Zielgruppe | **18 und älter** (soziale Funktionen mit Fremdenkontakt, konsistent mit Apples 12+/16+ Einschätzung – auf Google lieber konservativ 18+ wählen, spart eine Zusatzprüfung für "Apps für Kinder") |
| Enthält die App Werbung? | **Nein** |
| Ist die App für Kinder gestaltet? | **Nein** |

## Preis & Vertrieb

| Feld | Wert |
|------|------|
| Preis | Kostenlos |
| Länder | Erstmal nur Österreich (oder DACH: AT/DE/CH) – lässt sich jederzeit erweitern |
| In-App-Käufe | Nein |
| Werbung (Ads) | Nein |

---

## Nächster Schritt

Sobald der Play-Console-Account existiert: Diese Texte 1:1 in **Store-Präsenz → Hauptdaten der
Store-Eintragung** eintragen, Icon + Feature-Grafik + Screenshots hochladen, dann weiter mit dem
**Data-Safety-Fragebogen** (siehe [02-data-safety-fragebogen.md](02-data-safety-fragebogen.md)) und dem
**Inhaltsbewertung/IARC-Fragebogen**.
