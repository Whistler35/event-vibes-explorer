## Ziel

Die gesamte App in **Deutsch** und **Englisch** verfügbar machen. Sprache richtet sich automatisch nach dem bei der Registrierung gewählten Land (AT/DE/CH = Deutsch, sonst Englisch) und kann jederzeit über einen Sprach-Umschalter neben der Glocke gewechselt werden. Event-**Titel** bleiben immer in der Originalsprache des Hosts, **Beschreibungen** (und ähnliche Freitexte) werden übersetzt.

---

## 1. UI-Übersetzung (statische Texte)

**Bibliothek:** `react-i18next` + `i18next` (Standard, leichtgewichtig, gut zu Vite/React 18).

**Struktur:**
```text
src/i18n/
  index.ts              # i18n init
  locales/
    de.json             # alle deutschen Strings
    en.json             # alle englischen Strings
```

- `i18n.init()` in `src/main.tsx` einbinden, bevor `<App>` gerendert wird.
- Sprache wird gespeichert in `localStorage` unter `evendle.lang`.
- Initial-Sprache bestimmt sich nach Priorität:
  1. `localStorage` falls gesetzt
  2. `profiles.country` des eingeloggten Users (AT/DE/CH → `de`, sonst `en`)
  3. Browser-Sprache (`navigator.language`) als Fallback

**Übersetzte Bereiche (priorisiert):** Auth (Login/Register/Reset), BottomNavigation, Home, Nearby/Map (Filter, Buttons), EventDetail, EventCarousel/Card, CreateEventDialog/EditEventDialog, Profile, Messenger/DirectChat/EventChat, Blitz, HostDashboard/HostBilling, Tickets, Notifications-Texte, Toasts, Empty States.

**Vorgehen:** In jeder Komponente werden hartkodierte deutsche Strings durch `t('key')` ersetzt. Die Keys werden hierarchisch organisiert (z. B. `auth.login.title`, `event.actions.join`).

---

## 2. Auto-Sprache nach Land

- Im `Auth.tsx`-Register-Flow wird das Land bereits erfasst (Profil-Pflichtfeld). Direkt nach erfolgreicher Registrierung / nach dem ersten Login wird `profiles.country` gelesen und die Sprache entsprechend gesetzt + in `localStorage` persistiert.
- Wenn der User später sein Land in `EditProfile` ändert und noch keine manuelle Sprachauswahl getroffen hat, wird die Sprache neu abgeleitet.
- Sobald der User die Sprache **manuell** über den Switcher ändert, wird ein Flag `evendle.lang.manual = true` gesetzt → Land überschreibt die Auswahl nicht mehr.

---

## 3. Sprach-Umschalter im Header

- Neue Komponente `LanguageSwitcher.tsx` (kleines Globe-Icon mit Dropdown DE/EN, oder ein Toggle „DE | EN").
- Wird in `Home.tsx` direkt **neben der Glocke** (`NotificationBell`) platziert. Falls weitere Seiten denselben Header haben, gleich dort einbinden (Profile, Nearby Header).
- Aktion: setzt `i18n.language`, schreibt `localStorage`, setzt `manual`-Flag.

---

## 4. Event-Inhalte übersetzen (Description etc.)

**Regel:** `title` bleibt **immer** wie vom Host eingegeben. Übersetzt werden: `description`, `location_name` (optional), Kategorie-Label (statisch via i18n), Status-Texte.

**Ansatz:** On-Demand-Übersetzung via Lovable AI Gateway (`google/gemini-2.5-flash`, sehr günstig & schnell), mit Caching in der DB, damit jede Description pro Zielsprache nur **einmal** übersetzt wird.

### 4a. Datenbank

Neue Tabelle `event_translations`:
```text
id              uuid pk
event_id        uuid (FK → events.id, ON DELETE CASCADE)
language        text  ('de' | 'en')
description     text
source_hash     text  -- md5 der Originaldescription, um Stale-Übersetzungen zu erkennen
created_at      timestamptz default now()
updated_at      timestamptz default now()
unique (event_id, language)
```
- RLS: `SELECT` für alle (analog zu Events), `INSERT/UPDATE` nur via Edge Function (service role).

### 4b. Edge Function `translate-event`

- Input: `{ event_id, target_language }`.
- Lädt Event, prüft Cache (`event_translations`), wenn `source_hash` zur aktuellen Description passt → Cache zurückgeben.
- Sonst: ruft Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`, Model `google/gemini-2.5-flash`) mit Prompt: *„Translate the following event description to {de|en}. Keep tone, formatting, emojis. Do not translate proper nouns or the event title."*
- Schreibt Ergebnis in `event_translations` und gibt es zurück.
- `verify_jwt = true` (Standard), `LOVABLE_API_KEY` ist bereits verfügbar.

### 4c. Frontend-Hook `useEventTranslation(event)`

- Wenn `i18n.language` der Originalsprache entspricht (heuristisch: kurze Erkennung über Browser/`franc`-light oder einfach: wenn Hostland AT/DE/CH → Original = `de`, sonst `en`; Fallback: einfach immer übersetzen, wenn Ziel-Sprache ≠ erkannte Sprache).
- Holt übersetzte Description via Edge Function + React Query Cache (Key: `['event-translation', eventId, lang]`).
- Zeigt während des Ladens das Original mit kleinem „Übersetze…"-Hinweis.

**Verwendung:** `EventDetail.tsx`, `EventDetailSheet.tsx`, ggf. Karten-Tooltips. In Listen/Carousels wird **nicht** übersetzt (Performance), dort nur Titel + Datum.

---

## 5. Migration & Rollout

1. **Migration:** `event_translations` anlegen + RLS.
2. **i18n-Setup:** Bibliothek hinzufügen, Init, `de.json` & `en.json` mit kompletten Keys (Erstbefüllung Deutsch aus aktuellen Strings, Englisch professionell übersetzt).
3. **Refactor pro Bereich** (Auth → Navigation → Home → EventDetail → Create/Edit → Profile → Messenger → Blitz → Host).
4. **LanguageSwitcher** im Home-Header.
5. **Auto-Sprache** aus `profiles.country` in `AuthContext` integrieren.
6. **Edge Function** `translate-event` deployen + `useEventTranslation` Hook + Einbindung in EventDetail.

---

## Technische Notizen

- `react-i18next` keine Suspense nötig, synchrone Resourcen reichen (alle Strings im Bundle, ~30–60 KB gzip).
- Sprache wird im `<html lang="">` Attribut mitgepflegt für Accessibility.
- Datums-/Zeit-Formatierung: `toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-GB', …)` zentral in `src/lib/format.ts` bündeln.
- Keine externe Translation-API nötig — Lovable AI deckt das ab, kein zusätzlicher API-Key.
- Kosten: Gemini 2.5 Flash + Caching → praktisch vernachlässigbar.

---

**Bestätigst du diesen Plan, dann setze ich ihn in der genannten Reihenfolge um.** Aufgrund des Umfangs (viele Komponenten zu übersetzen) wird der erste Durchgang die wichtigsten Screens abdecken (Auth, Navigation, Home, EventDetail, Profile); weitere Screens kann ich danach iterativ nachziehen — sag mir gerne, falls du eine andere Priorisierung möchtest.