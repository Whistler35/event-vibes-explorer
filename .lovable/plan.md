## Plan: Three Blitz & Auth-Email Improvements

### 1) Branded Auth Email (EVENDLE Corporate Design)

Currently the user sees the default Lovable signup confirmation email (black button, "Verify Email", generic styling). We'll replace it with a branded version using EVENDLE colors:
- **Forest** `#173518` (background accent / button)
- **Citrus** `#f4f4bb` and **Lime** `#d8d87a` (highlights)
- White email body background (email best practice)
- German copy ("Willkommen bei EVENDLE", "E-Mail bestätigen")
- EVENDLE wordmark/logo at top

Steps:
- Scaffold all 6 auth email templates (signup, magic-link, recovery, invite, email-change, reauthentication) via Lovable's auth email system.
- Apply EVENDLE brand styling: Forest button, Citrus accent, white card on light background, friendly German copy.
- Deploy `auth-email-hook` so it goes live.
- Note: emails activate automatically once DNS verification finishes; in the meantime default templates are sent.

### 2) Move Incoming Requests Above + Badge on Blitz Tab

**Problem:** When the user has an active Blitz, incoming match requests render *below* the active screen (per screenshot). They should be on top so the user sees them immediately. Also: the BLITZ icon in the bottom nav should show a count badge for pending incoming requests.

Changes:
- **`src/pages/Blitz.tsx`**: Reorder so `<IncomingRequestsList />` renders **above** `<ActiveBlitzScreen />` when there's an active request.
- **New hook `src/hooks/useIncomingBlitzCount.ts`**: Counts pending right-swipes targeting the current user's active blitz request (subscribes to `blitz_swipes` realtime, filtered by host's active request).
- **`src/components/BottomNavigation.tsx`**: Add a pink count badge (same style as messenger unread badge) on the BLITZ icon when count > 0, using the new hook.

### 3) Extend Blitz Times to 1 Hour

Currently:
- Match chat expires after **5 minutes** (`chat_expires_at DEFAULT now() + interval '5 minutes'`)
- Request durations are 30 / 60 / 120 min (request expiry — used for accepting incoming swipes)

Changes:
- **New migration**: `ALTER TABLE blitz_matches ALTER COLUMN chat_expires_at SET DEFAULT (now() + interval '1 hour');`
- **`useBlitzMatching.ts` `acceptBlitzRequest`**: explicitly set `chat_expires_at` to `now + 1h` on insert (so existing default isn't relied on for fresh matches).
- **CreateBlitzModal `DURATIONS`**: keep options but ensure default is 1h. Already 60 min default — no change needed for request duration since 60 min = 1h is already an option. Confirm default selection is `60`.

### Technical Details

```text
Blitz.tsx render order (active state):
  ┌─────────────────────────────┐
  │ IncomingRequestsList (NEW)  │  ← moved above
  ├─────────────────────────────┤
  │ ActiveBlitzScreen           │
  └─────────────────────────────┘

BottomNav BLITZ icon:
  ⚡  ←  badge with pendingCount (top-right, pink)
```

New hook signature:
```ts
useIncomingBlitzCount(): { count: number }
// queries blitz_swipes where:
//   blitz_request_id IN (user's active requests)
//   direction='right' AND status='pending'
// subscribes to realtime changes
```

Migration:
```sql
ALTER TABLE public.blitz_matches
  ALTER COLUMN chat_expires_at SET DEFAULT (now() + interval '1 hour');
```

### Files Touched

- `supabase/functions/auth-email-hook/` (new, scaffolded)
- `supabase/functions/_shared/email-templates/*.tsx` (new, scaffolded + branded)
- `src/pages/Blitz.tsx` (reorder)
- `src/components/BottomNavigation.tsx` (badge)
- `src/hooks/useIncomingBlitzCount.ts` (new)
- `src/hooks/useBlitzMatching.ts` (set 1h chat_expires_at on accept)
- New migration for `chat_expires_at` default

### Open Questions

None — proceeding with German copy for emails (matches app), Forest+Citrus brand palette, and 1h chat duration as requested.