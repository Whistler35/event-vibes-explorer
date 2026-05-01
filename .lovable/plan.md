## Profile Redesign — "Blitz Lifestyle Dashboard"

A complete visual overhaul of `src/pages/Profile.tsx` to match the dark-forest + electric-pink Blitz aesthetic. We keep the existing backend reads but layer in a richer, card-driven layout, plus add multi-photo support to the profile.

### 1. New look & feel

- Background: deep dark forest green (#1C2B1C) applied as a section gradient on the profile page only (not global theme — preserves rest of app).
- Accent: existing `--blitz-pink` (#FF2D78 family) for highlights, badges, status text.
- Bold white sans-serif (Inter, already in stack).
- Layered cards with subtle inner shadow + rounded-3xl corners.

### 2. Sections (top → bottom)

1. **Top bar** — kept (logo + Settings/Logout/Tickets/Host/Admin icons), restyled to sit on dark bg.

2. **Immersive header**
   - Large circular avatar (160px) centered, with a radial dark-green glow ring + soft pink halo behind.
   - Below: `Name, Age` in 28px bold white. Verified shield kept.
   - Status line: `Bereit für den nächsten Blitz ⚡` in pink, 14px medium.
   - **Multi-photo strip:** horizontal scroller of additional photos under the avatar (small 64px rounded squares + "+" tile to add more). Tap a photo to view full; tap "+" to upload.

3. **Dynamic stats (3 cards, horizontal)**
   - Card 1: pink circle with `blitzSent` count → "Blitze gesendet ⚡"
   - Card 2: pink circle with `participatedCount` → "Teilgenommen 👍"
   - Card 3: pink circle with ⚡ icon → "Aktivitätslevel: <Niedrig|Mittel|Hoch> 🔥" (computed: <5 niedrig, <20 mittel, ≥20 hoch — based on `blitzSent + participated`)
   - Tap card 2/3 opens existing `ProfileStatsSheet`.

4. **About — "Was ich mache"**
   - Colored interest chips. Reads from `profile.bio` parsed by comma OR (preferred) a new `interests text[]` column on `profiles`.
   - Each chip gets a deterministic color from a palette (green/purple/pink/blue/orange) based on hash of label.
   - "Edit" pencil opens `/profile/edit` with a new interests field.

5. **Fun-fact sticker card**
   - Slightly rotated (-2deg) yellow/cream sticker card. "Fun fact!" label in pink bold + the user's `fun_fact` text + 😄 emoji.

6. **Friends — "Deine Blitz-Community (n)"**
   - Horizontal scrolling list of small friend cards (avatar 56px, name, short bio snippet "Ich bin 27 u…").
   - Last tile: "+ Freund finden" → opens existing `FriendSearch` in a sheet.
   - Replaces the current collapsible `FriendSearch` block.

7. **Letzte Aktivitäten**
   - Horizontal cards (image + title) for the user's 2 most recent participated/hosted events. Reuses `event_participants` join + events.
   - Tap → `/event/:id`.

8. **Bottom navigation** — already implemented per spec; no changes needed.

### 3. Backend changes

- **Migration:** add to `profiles`
  - `interests text[] not null default '{}'`
  - `photos text[] not null default '{}'` (additional gallery photos, in storage bucket `avatars`)
- Reuse existing `avatars` storage bucket for additional photos.
- **Stats query addition:** count rows in `blitz_requests` where `host_id = user.id` for "Blitze gesendet".

### 4. Files

- `supabase/migrations/<ts>_profile_extend.sql` — new columns
- `src/pages/Profile.tsx` — full rewrite of layout, keep data fetching, extend with `blitzSent` + photos + interests
- `src/pages/EditProfile.tsx` — add interests (chip input) + photo gallery upload section
- `src/components/profile/PhotoStrip.tsx` (new) — horizontal photo strip with add/remove
- `src/components/profile/InterestChips.tsx` (new) — colored chips component
- `src/components/profile/FriendsCarousel.tsx` (new) — horizontal friend cards, fetches friends + bios
- `src/components/profile/RecentActivities.tsx` (new) — last 2 events horizontal cards
- `src/index.css` — small additions: `.sticker-card` (rotation + shadow), `.profile-bg` (forest gradient)

### 5. Behavior preserved

- Host view (when `isHost`): keeps company name, verified badge, host links, host rating. The "Blitz" sections (status line, Blitze gesendet, interests, fun-fact sticker) are hidden for hosts since hosts don't use Blitz the same way — host profile retains its professional look.
- Logged-out and loading states unchanged.
- Admin shortcut card preserved at top.

### 6. Out of scope

- No theme-wide color change; only the Profile page gets the dark-forest backdrop.
- No changes to bottom nav (already matches).
- No new realtime subscriptions.

After approval I'll run the migration, build the components, wire them in, and update EditProfile to manage interests + gallery photos.