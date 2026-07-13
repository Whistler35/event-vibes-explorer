## Ziel

Visuelles Redesign der bestehenden App passend zu den 10 hochgeladenen Screenshots. Ausschließlich Styling/Layout — keine Änderungen an Supabase, Auth, Datenmodell, Hooks, Queries, Routen oder Business-Logik.

## Design-Sprache (aus den Screenshots abgeleitet)

- **Palette**
  - Background hell: `#F1EFE8` (warmes Off-White / Bone)
  - Forest Dark: `#1E3323` (Karten, Header, primär)
  - Bolt/Lime Accent: `#D4F26A` (CTA, Badges, aktiver Zustand)
  - Ink: `#0E1410` (Typo auf Hell)
  - Muted Ink: `#8A9186`
  - Card White: `#FFFFFF` mit weichem Schatten
  - Chat-Avatare farbig (Terracotta `#C86A4A`, Steel Blue `#3E6E86`, Plum `#5B4E7A`) — bleiben wie aktuell generiert
- **Typografie**
  - Display / Headlines: geometrisch-humanistisch, sehr fett (aktuell nutzen wir bereits sowas Ähnliches — beibehalten, nur Gewichte/Tracking justieren). Große Headlines `text-4xl`–`text-6xl` mit `font-black` und leicht negativem Tracking.
  - Uppercase-Labels (`EVENDLE BLITZ`, `WHO'S IN`, `MY BLITZ`) mit `tracking-[0.25em]` und `text-xs`, muted.
  - Body: normaler Sans, `font-medium` für Sekundäres.
- **Formen / Radius**
  - Karten: `rounded-3xl` (24–28px)
  - Pills / Segmented Control / Buttons: vollständig `rounded-full`
  - Bottom-Nav: floating Pill mit weißer Fläche und Schatten
- **Schatten**
  - Karten: weich, niedrig (`0 8px 24px rgba(0,0,0,0.06)`)
  - Lime-CTA & aktiver Bottom-Nav-Blitz-Button: sanfter Lime-Glow
- **Motion**: keine Änderung — bestehende Blitz-Animationen bleiben.

## Design-Tokens (in `src/index.css`)

Nur Werte anpassen, keine Tokens umbenennen (damit alle Konsumenten weiter funktionieren):

- `--background` → Bone `#F1EFE8`
- `--foreground` → Ink `#0E1410`
- `--card` → `#FFFFFF`
- `--primary` → Forest `#1E3323`
- `--primary-foreground` → Bone
- `--muted-foreground` → `#8A9186`
- `--bolt` → `#D4F26A` (aktualisieren)
- `--blitz-forest` bleibt, Wert auf `#1E3323` justieren
- Neuer Utility-Layer: `.surface-forest`, `.surface-card`, `.pill-lime`, `.label-caps` — optional, um wiederholte Klassen zu bündeln

`html { @apply dark; }` wird entfernt — App läuft im Light-Mode (die Screenshots sind hell). Dark-Tokens bleiben als Fallback bestehen.

## Betroffene Screens (nur visuelles Refactor der Klassen/Struktur, Props & Handler unverändert)

1. **Bottom Navigation** (`src/components/BottomNavigation.tsx`)
   - Floating white Pill, große Icons, mittig der Blitz-CTA als Lime-Kreis mit Glow, Label `BLITZ` darunter. Chats-Badge als kleiner Lime-Kreis oben rechts am Icon.

2. **Blitz Landing / My Blitz + Discover** (`src/pages/Blitz.tsx`, `ActiveBlitzScreen.tsx`, `DiscoveryDeck.tsx`)
   - Segmented Control „MY BLITZ / DISCOVER" oben als Pill mit dunkler aktiver Hälfte.
   - Große Forest-Karte mit uppercase Label, Riesen-Headline `FEELING SPONTANEOUS?`, Bolt-Icon zentriert, Footer-Label `TAP TO BLITZ`.
   - Discover-Karte: Forest-Karte mit Aktivitäts-Icon-Tile (Lime auf dunklem Grün), Titel, Host-Zeile, Location, „X, Y are in" Avatar-Cluster; darunter runde X/✓ Action-Buttons (weiß / lime).
   - Active-Blitz-Karte: Label + Aktivität, „You are hosting · ends in …", Sparkle-Add-Icon, „JP Jakob is in", CTA-Text „TAP TO OPEN HUDDLE" + Lime-Pill „⚡ ends in 1h 59m" darunter.

3. **Create Blitz Modal** (`src/components/blitz/CreateBlitzModal.tsx`)
   - Dark Forest Sheet, Header mit Lime-Tile + „BLITZ / Spontaneous Request".
   - Input als unterstrichenes Feld (kein Border-Rechteck), großer Placeholder.
   - Dauer-Auswahl als drei gleich große Karten, aktiv = Lime-Outline + Lime-Text.
   - Radius-Slider mit Lime-Fill, aktueller Wert lime unter dem Slider.
   - Sichtbarkeit: 3 Kacheln „Öffentlich / Freunde / Auswählen" — aktive lime umrandet. Wichtig: der „BLITZ NOW"-Button bleibt **immer** sichtbar am unteren Rand (fix positioniert, safe-area padding). Bestehender Fix aus vorheriger Iteration bleibt erhalten.

4. **Freunde auswählen Sheet** (im CreateBlitzModal-Flow / FriendSearch)
   - Sektionen „CLOSE FRIENDS", „RECENT PLANS WITH", „FROM YOUR CONTACTS".
   - Close-Friends-Karte: Forest, Avatar-Cluster, Titel + „6 people", großer Lime „Blitz them" Button.
   - Recent/Contacts: weiße Cards mit Avatar, Name, Sublabel und Pill-Button (`Blitz` lime / `Add` outline).

5. **Blitz Match / Huddle-Detail** (`src/pages/BlitzMatch.tsx`)
   - Heller Screen. Zurück-Pfeil links, Lime-Pill „3 IN" rechts oben.
   - Riesen-Titel „Spritz at the Inn?", Host-Zeile mit Avatar.
   - Zwei Info-Pills (Zeit, Location) in weiß.
   - Map-Preview als abgerundete Karte mit Streifen-Placeholder + Zentrum-Dot (bestehende Map bleibt, nur Rahmen/Radius/Caption angepasst).
   - „WHO'S IN" Chip-Grid (Avatar + Name + Rolle wie HOST/IN/MAYBE).
   - „+ Invite more friends" Outline-Pill über volle Breite.
   - „THE HUDDLE" Chat-Bubbles: weiße Karten, Absendername farbig, Text ink; Composer unten mit Lime-Send-Button (Blitz-Icon).

6. **Chats-Liste** (`src/pages/Messenger.tsx`)
   - Großer Titel „Chats", Sublabel „Your active Blitz huddles.".
   - Zeilen als weiße Karten: quadratisches Icon-Tile links (Aktivitäts-Emoji/Icon), Titel, letzte Nachricht, Zeit rechts + Unread-Dot lime. Sortierung/Unread-Logik bleibt bestehen.

7. **Profile** (`src/pages/Profile.tsx`)
   - Heller Screen, großer Avatar zentriert, Name, `@handle · Stadt`.
   - Drei weiße Stat-Karten (Blitzes sent / Joined / Friends).
   - „USUALLY UP FOR" Section mit outline Chips + „Edit"-Link.
   - Friends-Search-Feld als weiße Pill.
   - Close-Friends-Forest-Card mit „Blitz them"-Lime-Button.
   - Recent Plans / Contacts wie oben.
   - Bestehende Datenquellen (Stats-Hook, Friends-Hook, InterestChips) unverändert weiterverwendet.

8. **Onboarding letzter Step + „You're in"** (`src/pages/Onboarding.tsx`)
   - „Find your people." Headline, weiße Kachel „Connect contacts" mit Forest-Allow-Button, zweite Kachel mit Share-Link + Outline-Share-Button, unten großer Lime „Done" + Textlink „Not now".
   - „You're in, Jakob." Screen: dunkler Forest-Grund mit radialem Glow, großer Lime Blitz-Kreis mit Pulse (bestehende Animationen), Headline + Subline, Lime-CTA „Send my first Blitz" + Outline „Look around first".

## Was NICHT angefasst wird

- `src/integrations/supabase/*` (Client, Types)
- Auth-Flows (`Auth.tsx`, `AuthCallback.tsx`, `nativeGoogleAuth`, Lovable-OAuth-Bridge) — nur wenn Farbklassen offensichtlich brechen, sonst zero touch
- Alle Hooks (`useBlitz*`, `useMyPendingSwipes`, `useNotifications`, …)
- Migrations / RLS / Edge Functions
- Router, Routen, Deep Links
- Business-Logik in Handlern, Mutations, Realtime-Subscriptions

## Mobile / Safe-Area

- `Layout.tsx` behält `env(safe-area-inset-top/bottom)`.
- Bottom-Nav bleibt fixed mit `pb-safe`.
- Alle Screens: `max-w-md mx-auto` Container beibehalten, horizontales Padding `px-5`.
- Kein `overflow-x`, `overscroll-behavior: contain` bleibt.
- Buttons ≥ 48px Touch-Target.

## Vorgehen (schrittweise)

1. Tokens & globale Styles (`index.css`, `tailwind.config.ts` falls nötig) — Light-Mode aktivieren, Farben justieren.
2. `BottomNavigation` neu stylen.
3. Blitz-Hauptscreen + `ActiveBlitzScreen` + `DiscoveryDeck` visuell anpassen.
4. `CreateBlitzModal` + Friend-Select-Sheet.
5. `BlitzMatch` (Huddle) inkl. Map-Rahmen und Chat-Bubbles.
6. `Messenger` Liste.
7. `Profile`.
8. `Onboarding` finale Steps + „You're in" Screen.
9. Visueller Check per Playwright-Screenshots (Mobile Viewport 390×844) für alle Screens; Konsole auf Fehler prüfen.

## Verifikation nach Umsetzung

- Login (Email + Google + Apple) unverändert erreichbar
- Blitz erstellen / swipen / matchen / chatten funktioniert wie vorher
- Bottom-Nav-Routing, Zurück-Navigation, Deep Links
- Chats + Unread-Badge korrekt
- Keine Console-Errors, keine horizontalen Scrolls auf 390px

Bei Konflikt Design ↔ Funktion gewinnt Funktion — Design wird angepasst, Handler/Queries bleiben.
