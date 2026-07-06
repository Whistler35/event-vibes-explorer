## EVENDLE Pivot → Blitz-only App (Hinge/Snapchat-Style)

### 1. Reduktion: Alles außer Blitz raus

**Gelöschte Seiten & Komponenten** (Code komplett entfernt):
- `src/pages/`: Events, Home, Nearby, CityEvents, EventDetail, EventChatPage, EventHangouts, EventCheckin, HostDashboard, HostBilling, HostStats, AdminEvents, Tickets, Chat, EvenldeWelcomeChat
- `src/components/`: alle Event*, Host*, Admin*, JoinRequest*, CategoryFilter, MapboxMap/OpenStreetMap/SimpleMap/ModernMap/InteractiveMap, ReelsFeed, QuickTicketSheet, CollapsibleCarousel, CreateEventDialog/EditEventDialog usw.
- Hooks: useSearchEvents, useTrackVisit, useIsHost, useIsAdmin, usePendingEventsCount, useEventTranslation
- Edge Functions: `ingest-scraped-events`, `search-events`, `translate-event`, `mapbox-token`, `google-maps-key` (Maps braucht die App nicht mehr)

**DB bleibt vorerst unangetastet** (keine Tabellen droppen — Blitz-Tabellen behalten, Event-Tabellen ignorieren; falls du später wirklich willst, machen wir Cleanup separat).

**Bleiben:** Blitz-Flow, Messenger/DirectChat, Profile, Auth, Notifications, Friendships.

### 2. Navigation neu

`BottomNavigation.tsx` auf 3 Items:
```
[ Chat ]   [ ⚡ BLITZ (grün, groß, Mitte) ]   [ Profil ]
```
- Blitz-Button: Forest `#173518` statt Pink, gleiche große Kreis-Optik
- Kein Host-Tab, kein Events-Tab, kein Nearby-Tab

### 3. Farbsystem: Pink → Forest

- `--blitz-pink` in `index.css` entfernen bzw. auf Forest mappen; alle `hsl(var(--blitz-pink))`-Verwendungen im Code auf Forest umstellen (BottomNav, Blitz-Screens, Badges, Buttons, Cards, Match-Screens, MyMatchesBanner, IncomingRequestsList, DiscoveryDeck-Overlays)
- Neue Akzent-Palette: **Forest #173518** primär, **Weiß** Flächen, minimales Cream/Lime nur wo semantisch nötig
- Ungenutzt: Citrus/Lime bleiben als Tokens, werden aber nicht mehr aktiv gesetzt

### 4. Snapchat-Style Login-Screen

Neue Landing-Route `/` **für ausgeloggte User**:
- Vollflächig Forest-Hintergrund
- Zentriert großer weißer Blitz (Zap-Icon, gefüllt)
- Unten zwei Buttons: **LOGIN** / **SIGN UP** (weiß auf Forest, klare Trennung à la Snapchat)
- Kein anderer Content, keine Bottom-Nav

Eingeloggte User: `/` redirected direkt in den **Blitz-Discovery-Tab**.

### 5. Auto-Start = Blitz Discovery

- `App.tsx` Routing: Default-Route `/` → wenn eingeloggt → `Blitz` mit Tab `discover` als Initial-State
- Aktuell startet Blitz mit Tab `request` ("Mein Blitz") — Default umschalten auf `discover`
- Kein B2B/Host-Onboarding mehr sichtbar

### 6. Auth-Umstellung → Phone-Only (Neuregistrierungen)

**Bestehende E-Mail/Google-User bleiben eingeloggt und funktionsfähig** (Sessions & Login-Wege bleiben serverseitig aktiv).

Neue User-Flow:
- `Auth.tsx` komplett neu: nur noch **Telefonnummer + SMS-OTP** (Supabase `signInWithOtp({ phone })` → `verifyOtp`)
- E-Mail-/Google-Buttons für Neuregistrierung entfernt (Login-Feld für Alt-User: kleiner „Mit E-Mail einloggen"-Link als Fallback, damit niemand ausgesperrt wird)
- Auth-Config bleibt: E-Mail-Provider bleibt aktiviert (für Bestandsuser), Phone-Provider muss aktiviert sein

**Wichtig:** Phone/SMS-Provider (Twilio o.ä.) in der Cloud-Auth aktiviert sein muss, damit OTP verschickt wird. Falls noch nicht konfiguriert, sag mir welchen SMS-Anbieter — sonst schlagen OTPs fehl.

### 7. Post-Registration: Native Permissions

Nach erfolgreichem Sign-Up (nur nativ via Capacitor, im Web übersprungen):
1. **Kontakte-Zugriff** anfragen (`@capacitor-community/contacts`) → Nummern hashen (SHA-256) → mit `profiles.phone_hash` matchen → Friend-Suggestions
2. **Standort-Zugriff** anfragen (`@capacitor/geolocation`) → in Profil cachen

Neue DB-Spalten (Migration):
- `profiles.phone` (text, unique, nullable)
- `profiles.phone_hash` (text, indexed) — für Kontakte-Matching ohne Klartext-Nummern zu speichern
- Trigger aktualisiert `phone_hash` automatisch aus `phone`

Neue Seite `/onboarding/permissions` nach Sign-Up.

### 8. Freunde gezielt anblitzen

Erweiterung von `CreateBlitzModal`:
- Zusätzlich zu `public` / `friends` neuer Modus **`selected_friends`**
- Multi-Select-Liste aller bestätigten Freunde (aus `friendships`)
- Migration: `blitz_requests.audience` Enum erweitern + neue Spalte `blitz_requests.target_user_ids uuid[]`
- RLS anpassen: nur User in `target_user_ids` (plus Friends bei friends-Modus, plus alle bei public) sehen Request im DiscoveryDeck
- Notification an gezielte Freunde beim Erstellen (Push falls Subscription vorhanden)

### 9. Session-Persistenz

Supabase-Session ist bereits in `localStorage` — bestehende User bleiben eingeloggt. **Keine Änderung nötig**, nur bestätigen dass wir den Auth-Client nicht resetten.

---

### Technisches

**Migrations:**
1. `profiles.phone` + `profiles.phone_hash` + Index + Trigger
2. `blitz_requests.target_user_ids uuid[]` + RLS-Update für Discovery
3. `blitz_audience` Enum: `selected` hinzufügen

**Dependencies:**
- `@capacitor-community/contacts` (nur nativ)
- `@capacitor/geolocation` (vermutlich schon da — prüfen)

**Config:**
- Cloud Auth: Phone-Provider aktivieren (via `configure_auth`)
- Google/Apple Social-Auth: **deaktivieren** (falls aktiv), da nur Phone gewollt für Neuregistrierungen — Bestandsuser haben keine Auswirkung

**Löschumfang (grob):** ca. 50+ Dateien werden entfernt. i18n-Keys für Events/Host/Admin ebenfalls raus.

**Nicht-Ziele dieses Turns:**
- Kein DB-Cleanup der Event-Tabellen (bleiben ungenutzt liegen)
- Kein Redesign des Messenger (behält aktuelle Optik, nur Pink-Akzente auf Forest umstellen)
- Kein neues Onboarding-Design außer der Snapchat-Landing + Permissions-Screen

### Reihenfolge der Umsetzung

1. Farbtokens Pink→Forest global
2. Bottom-Nav auf 3 Tabs
3. Snapchat-Landing + Auth-Redirect-Logik
4. Blitz startet in Discovery
5. Auth.tsx auf Phone-OTP umbauen + Cloud-Auth konfigurieren
6. Migrations (profiles.phone*, blitz target_user_ids)
7. CreateBlitzModal: selected friends
8. Capacitor Kontakte + Geolocation Permissions Onboarding
9. Massen-Löschung Event/Host/Admin/Tickets/Nearby-Dateien + Routen aus App.tsx
10. i18n bereinigen

Sag Bescheid welchen SMS-Provider ich für Phone-Auth konfigurieren soll (Twilio ist Standard bei Supabase) — sonst mache ich alles andere und der Phone-Login zeigt später einen Konfigurationsfehler bis das nachgezogen ist.
