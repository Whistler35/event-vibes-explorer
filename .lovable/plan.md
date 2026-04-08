

## Top Events auf der Karte hervorheben

### Konzept
Events mit `is_top_event = true` bekommen auf der Karte einen goldenen Rahmen und ein kleines Stern-Badge. Admins und Hosts (via Pay-per-Event "Top Event" Option) können Events als Top Event markieren.

### Datenbank
Die `events`-Tabelle hat bereits ein `is_featured`-Feld (boolean, default false). Dieses wird als "Top Event"-Flag genutzt -- keine Migration nötig.

### Änderungen

**1. Search-Events Edge Function anpassen**
- `is_featured` im SELECT und in der Response zurückgeben, damit die Karte weiß, welche Events Top Events sind.

**2. `useSearchEvents.ts` -- Interface erweitern**
- `SearchEvent` um `is_featured: boolean` ergänzen.

**3. `InteractiveMap.tsx` und `MapboxMap.tsx` -- MapEvent erweitern**
- `MapEvent` Interface um `is_featured?: boolean` ergänzen.

**4. `MapboxMap.tsx` -- Marker-Rendering anpassen**
- Wenn `event.is_featured === true`:
  - Goldener Rahmen (`#DAA520`) statt dem Standard-Grün (`#3B4D34`)
  - Kleines Stern-Icon (★) als Badge oben rechts am Marker-Kreis
  - Leicht größerer Marker (56px statt 50px) für mehr Sichtbarkeit

**5. `Nearby.tsx` -- `is_featured` an MapEvents durchreichen**
- Bei publicMapEvents und privateMapEvents das Feld `is_featured` mappen.

**6. Host-Seite / Admin -- Top Event setzen**
- Im CreateEventDialog bzw. Billing-Flow: Wenn Host "Top Event" (€49.90) wählt, wird `is_featured = true` gesetzt.
- Im Admin Panel: Admins können Events als "Top Event" markieren/entfernen.

### Visuelles Ergebnis
```text
  Normal Marker          Top Event Marker
  ┌──────────┐          ┌──────────┐
  │  ┌────┐  │          │  ┌────┐★ │
  │  │ 🖼️ │  │          │  │ 🖼️ │  │
  │  └────┘  │          │  └────┘  │
  │  grün    │          │  gold    │
  │  Rahmen  │          │  Rahmen  │
  └──────────┘          └──────────┘
```

