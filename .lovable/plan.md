## Vergleich mit Evendle 2.0 — kurz

Struktur & Farben stimmen weitgehend (Forest / Lime / Cream, BLITZ-Tabs, Huddle mit „+ Invite more friends", floatende Bottom-Nav). Es fehlen aber ein paar sehr sichtbare Dinge, die Evendle 2.0 seinen Look geben. Genau die will ich in diesem Plan angleichen — **ohne** Businesslogik, Supabase oder Auth-Flow zu ändern.

## Was noch nicht passt

1. **Typografie fehlt komplett**
   Space Grotesk (Display) + Instrument Sans (Body) sind nirgendwo geladen. Alle Headlines rendern in einem System-Sans → die charakteristische Evendle-Anmutung geht verloren.

2. **Farbtokens teils approximiert**
   Nur `#1E3323` (Forest) und `#C8F14F` (Lime) stimmen exakt. `#F4F3ED` (Cream), `#131711` (Ink) und `#79826F` (Muted) sind mit leicht anderen Werten (`#F1EFE8` etc.) hinterlegt → Hintergrund und Texte kippen minimal.

3. **BlitzMatch (Huddle) — Map-Preview fehlt**
   Referenz zeigt eine gestreifte/„pixelige" Map-Karte mit Punkt + Untertitel „map preview — Inn river steps, 650 m away". Aktuell kein Map-Block, keine Ort-Pill neben dem Timer.

4. **Onboarding — „Ready"-Screen fehlt**
   Nach dem letzten Step springt die App direkt auf `/blitz`. Referenz hat einen kurzen „You're in, Jakob."-Moment mit pulsierendem Lime-Bolt.

5. **Landing benutzt Inline-Hex statt Tokens**
   `Landing.tsx` hat `#15271B`, `#C8F14F`, `#131711` hart im JSX. Nach dem Token-Fix soll sie diese Werte über CSS-Variablen ziehen.

6. **Profile — vorbereiteter Forest-Look ungenutzt**
   `.profile-blitz-bg`, `.blitz-stat-card`, `.profile-avatar-halo` sind in `index.css` definiert, aber `Profile.tsx` rendert plain. Referenz-Profil ist deutlich grafischer.

## Was ich ändern werde

### Schritt 1 — Fonts einbauen
- In `index.html` Preconnect + Google-Fonts-Link für **Space Grotesk (500/600/700)** und **Instrument Sans (400/500/600/700)**.
- In `tailwind.config.ts` `fontFamily.display = ["Space Grotesk", …]` und `fontFamily.sans = ["Instrument Sans", …]` erweitern.
- In `src/index.css` `body { font-family: "Instrument Sans", … }` und Utility `.font-display` für Headlines.
- Große Titel in Landing, Auth, Onboarding, Blitz, BlitzMatch, Profile auf `font-display` + entsprechende Gewichte umstellen.

### Schritt 2 — Farbtokens exakt setzen
- In `src/index.css` die Kernfarben auf die Evendle-2.0-Werte ziehen:
  - `--background` → `#F4F3ED`
  - `--foreground` / `--ink` → `#131711`
  - `--muted-foreground` → `#79826F`
  - `--blitz-forest` bleibt `#1E3323`, ergänzen: `--blitz-forest-dark #15271B`, `--blitz-forest-mid #2C4632`
  - `--bolt` bleibt `#C8F14F`
- Inline-Hex in `Landing.tsx` durch diese Tokens ersetzen.

### Schritt 3 — BlitzMatch: Map-Preview + Ort-Pill
- In `src/pages/BlitzMatch.tsx` unterhalb Titel/Host eine **Ort-Pill** neben der Timer-Pill (Pin-Icon + Ortsname aus `blitz_requests`).
- Darunter ein **Map-Preview-Block** im Referenz-Stil: cream Rechteck mit diagonalen Streifen (CSS `repeating-linear-gradient`), zentriertem Forest-Punkt mit Lime-Kern, Footer-Text „map preview — {Ort}, {Distanz} away". Distanz erstmal statisch/omitted falls kein Wert.
- Kein Mapbox-Load — bewusst als illustratives Placeholder gehalten (matcht Referenz exakt).

### Schritt 4 — Onboarding „Ready"-Screen
- In `src/pages/Onboarding.tsx` neuen Terminal-Step `ready` einfügen: dunkler Forest-Full-Bleed, pulsierender Lime-Bolt (`animate-blitz-pulse`), Titel **„You're in, {Vorname}."** + Sub „Send your first Blitz.", zwei Buttons: **„Send a Blitz"** (Lime) → `/blitz` + Create-Modal, **„Just look around"** (outlined) → `/blitz`.
- `finish()` wechselt zu diesem Step, statt sofort zu navigieren.

### Schritt 5 — Landing-Politur
- Alle Inline-Hex durch `hsl(var(--…))` ersetzen.
- Headline auf `font-display font-bold tracking-tight` — sonst identisch.

### Schritt 6 — Profile-Forest-Look aktivieren
- `Profile.tsx`-Root bekommt `profile-blitz-bg`, Stat-Cards `blitz-stat-card`, Avatar `profile-avatar-halo` — Klassen sind schon in `index.css` vorhanden, müssen nur angewandt werden.
- Text-Farben in weiß/lime für Kontrast auf Forest anpassen.

## Was ich bewusst NICHT anfasse

- Auth-Flow / OAuth / Test-User
- Supabase-Schema, RLS, Edge-Functions
- Blitz-Erstellung, Discovery-Matching, Chat-Persistenz
- CreateBlitzModal-Felder (Aktivität bleibt Textfeld — Umbau auf Tile-Grid wäre ein Feature-Change, kein UI-Angleich)
- i18n-Schlüssel bleiben — nur Fallback-Texte für die neuen Screens werden auf Englisch gesetzt (matcht Referenz)

## Verifikation

- Playwright-Screenshots auf 390×844 für Landing, Onboarding-Ready, Blitz, BlitzMatch, Profile → mit den Referenz-Uploads gegenprüfen.
- TypeCheck + Console frei von Errors.
- Fonts wirklich geladen (Network-Tab zeigt Google-Fonts-Requests, Rendered-Font-Check im DevTools).