# Pflicht-Funktionen: Datenbank aktivieren & testen

Der Code (Blockieren / Melden / Konto löschen) ist fertig und gebaut. Damit er
funktioniert, muss **einmal** die Datenbank erweitert werden. Kein Terminal nötig.

## Schritt 1 – SQL in Supabase ausführen

1. Öffne <https://supabase.com/dashboard/project/wrqckgrnshklyaiilprz/sql/new>
   (bzw. Supabase-Dashboard → Projekt EVENDLE → **SQL Editor** → **New query**)
2. Öffne im Projekt die Datei
   **`supabase/migrations/20260909120000_apple_review_moderation.sql`**
   und kopiere den **kompletten Inhalt**
3. Einfügen in den SQL-Editor → **Run** (unten rechts)
4. Erwartung: „Success. No rows returned." Wenn eine Fehlermeldung kommt →
   kompletten Text kopieren und mir schicken.

> Das Skript ist so gebaut, dass ein zweiter Durchlauf nichts kaputt macht
> (`create table if not exists`, `drop policy if exists`).

## Schritt 2 – TypeScript-Typen aktualisieren (optional, aber sauber)

Der Code läuft auch ohne, aber damit die neuen Tabellen typisiert sind:
- **Mit Lovable:** Lovable erkennt neue Tabellen meist automatisch beim nächsten
  Sync. Oder in Lovable einmal „regenerate Supabase types" anstoßen.
- Ändert nichts an der Funktion – nur an der Entwickler-Typprüfung.

## Schritt 3 – Testen (am besten zu zweit oder mit 2 Accounts)

| Test | So geht's | Erwartung |
|------|-----------|-----------|
| **Melden** | Fremdes Profil öffnen → oben rechts **⋯** → *Melden* → Grund wählen → senden | Toast „Danke – deine Meldung ist eingegangen". In Supabase Tabelle `reports` liegt eine neue Zeile. |
| **Blockieren** | Fremdes Profil oder Chat → **⋯** → *Blockieren* → bestätigen | Person verschwindet aus Blitz-Entdeckung und Nachrichten-Liste. In `blocked_users` neue Zeile. |
| **Nachricht trotz Block** | Als blockierte Person versuchen zu schreiben | Nachricht wird von der Datenbank abgewiesen (kommt nicht an). |
| **Block aufheben** | Profil der blockierten Person → **⋯** → *Blockierung aufheben* | Person wieder sichtbar. |
| **Konto löschen** | **Profil → Bearbeiten** (Zahnrad) → ganz unten *Konto löschen* → „LÖSCHEN" eintippen → bestätigen | Wirst abgemeldet, landest auf Startseite. In `auth.users` ist der Nutzer weg, zugehörige Daten ebenfalls. |

## Wo Admins die Meldungen sehen

Aktuell landen Meldungen in der Tabelle `reports` (Status `open`). Sichtbar für
Konten mit Rolle `admin` oder `moderator`. Eine hübsche Admin-Oberfläche dafür
ist **nicht** Pflicht für die App-Store-Freigabe – wir können sie später bauen.
Für den Review reicht: Meldefunktion vorhanden + wir reagieren darauf.
