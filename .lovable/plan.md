

## Plan: Reels-Feed auf der Home-Seite einbauen

Die `ReelsFeed`-Komponente existiert bereits (`src/components/ReelsFeed.tsx`) mit 5 Demo-Videos, TikTok-style Vertical Scroll, Like/Share/Mute-Buttons und Snap-Scrolling.

### Änderung

**`src/pages/Home.tsx`** (2 Zeilen):
1. Import hinzufügen: `import ReelsFeed from "@/components/ReelsFeed";`
2. `<ReelsFeed />` direkt nach dem Top Events `</div>` (nach Zeile 103) einfügen, innerhalb eines `<div className="px-4 pb-8">` Wrappers.

Das war's — die Komponente ist fertig und muss nur eingebunden werden.

