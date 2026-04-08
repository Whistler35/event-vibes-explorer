

## Top Events — Corporate Design Farben

Aus der Corporate Identity ergeben sich vier Farben: **Forest (#173518)**, **White (#ffffff)**, **Citrus (#f4f4bb)** und **Lime (#d8d87a)**.

Statt dem aktuellen Gold (#DAA520) werden Top Event Marker mit **Citrus (#f4f4bb)** als Rahmenfarbe und **Lime (#d8d87a)** als Stern-Badge-Hintergrund gestaltet. Das passt perfekt zum Evendle Branding.

### Änderungen

**`src/components/MapboxMap.tsx`** — Marker-Styling anpassen:
- Rahmenfarbe Featured: `#DAA520` → `#f4f4bb` (Citrus)
- Box-Shadow Featured: goldener Glow → Citrus-Glow (`rgba(244,244,187,0.5)`)
- Stern-Badge Hintergrund: `#DAA520` → `#d8d87a` (Lime)
- Stern-Badge Textfarbe: weiß → `#173518` (Forest) für besseren Kontrast

```text
  Normal Marker          Top Event Marker
  ┌──────────┐          ┌──────────┐
  │  ┌────┐  │          │  ┌────┐★ │
  │  │ 🖼️ │  │          │  │ 🖼️ │  │
  │  └────┘  │          │  └────┘  │
  │ #173518  │          │ #f4f4bb  │
  │  Forest  │          │  Citrus  │
  └──────────┘          └──────────┘
```

