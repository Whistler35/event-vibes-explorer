# Status: Google/Apple-Login & Push-Benachrichtigungen

Geprüft am 09.09.2026 (soweit ohne Zugriff auf Google Cloud Console, Apple Developer
Portal und Supabase-Dashboard möglich — dort hat nur Jakob Zugang).

---

## 1. Google-Login

| Ebene | Status |
|-------|--------|
| Supabase-Provider „Google" | ✅ **aktiviert** (`/auth/v1/settings` → `google: true`) |
| Authorize-Weiterleitung | ✅ leitet korrekt zu `accounts.google.com` weiter, mit `redirect_uri = https://yhetszgeflsldahfuwen.supabase.co/auth/v1/callback` |
| Client-ID (Web/Server) | `172064364995-rhjcdn4tdeg09omj46l2jpvur7j1eb8s.apps.googleusercontent.com` |
| Client-ID (iOS nativ) | `172064364995-jimhmvn5njc39u8rtm30qnfmf223o5es...` (in `Info.plist` hinterlegt) |
| **iOS-nativ-Flow** (`nativeOAuth` in `Auth.tsx`) | Code ist korrekt: eigener PKCE-Verifier → `@capacitor/browser` → Deep-Link `com.evendle.app://login-callback` → `exchangeCodeForSession`. **Läuft nur, wenn Punkt A + B unten stimmen.** |
| **Web-Flow** (evendle.com) | ⚠️ nutzt `lovable.auth.signInWithOAuth`. Laut unseren früheren Notizen hat das auf der Custom-Domain evendle.com Probleme gemacht (Lovable-Proxy `/~oauth/initiate` → 404). **Bitte auf evendle.com einmal echt durchklicken.** Für die **iOS-App irrelevant** (die nutzt den nativen Flow). |

### Muss noch geprüft werden (Zugriff nötig)
- **A) Google Cloud Console** → OAuth-Client → „Autorisierte Weiterleitungs-URIs" muss enthalten:
  `https://yhetszgeflsldahfuwen.supabase.co/auth/v1/callback`
  (sonst: „redirect_uri_mismatch" beim Login)
- **B) Supabase → Authentication → URL Configuration → Redirect URLs** muss enthalten:
  `com.evendle.app://login-callback`
  (sonst bricht der native Rücksprung in die App ab)

---

## 2. Apple-Login

| Ebene | Status |
|-------|--------|
| Supabase-Provider „Apple" | ✅ **aktiviert** (`apple: true`) |
| Authorize-Weiterleitung | ✅ leitet zu `appleid.apple.com` weiter, `client_id = com.evendle.app.signin` (Service-ID) |
| iOS-Xcode-Capability „Sign in with Apple" | ✅ in `ios/App/App/App.entitlements` vorhanden (`com.apple.developer.applesignin`) |
| **iOS-nativ-Flow** (`nativeAppleSignIn`) | Code korrekt: `@capacitor-community/apple-sign-in` → `identityToken` + raw nonce → `supabase.auth.signInWithIdToken({ provider: 'apple', ... })` |

### Muss noch geprüft werden (Zugriff nötig)
- **C) Supabase → Authentication → Providers → Apple → „Authorized Client IDs"** muss **`com.evendle.app`** enthalten (die Bundle-ID der App). Ohne das lehnt Supabase den `signInWithIdToken`-Aufruf aus der nativen App ab.
- **D)** Im Apple Developer Portal muss die App-ID `com.evendle.app` die Capability **„Sign In with Apple"** aktiviert haben. Xcode macht das beim ersten Signieren meist automatisch mit („Try Again").

> **Wichtig für den App Store:** Weil die App „Mit Google anmelden" anbietet, verlangt Apple (Richtlinie 4.8) zwingend auch „Mit Apple anmelden". Das ist vorhanden ✅ — muss beim Review nur funktionieren.

---

## 3. Push-Benachrichtigungen

| Plattform | Status | Details |
|-----------|--------|---------|
| **Web (evendle.com)** | 🟡 vorhanden, Config prüfen | Service Worker + Web-Push + VAPID. Funktioniert, **wenn** in den Supabase Edge-Function-Secrets `VAPID_PUBLIC_KEY` **und** `VAPID_PRIVATE_KEY` gesetzt sind. `VITE_VAPID_PUBLIC_KEY` ist in `.env` → privater Key vermutlich auch gesetzt, bitte in Supabase bestätigen. |
| **iOS-App (APNs)** | ❌ **funktioniert derzeit nicht** | Zwei Lücken: siehe unten |

### Warum iOS-Push aktuell nicht geht
1. **Kein Sende-Code für APNs.** Die Edge Function `send-push-notification` verschickt **nur Web-Push** (`web-push`-Library, `endpoint`/`p256dh`/`auth`). Das gespeicherte native `device_token` wird komplett ignoriert. Es gibt keinen Code, der eine APNs-Nachricht an iPhones schickt.
2. **Keine Push-Capability im iOS-Projekt.** `App.entitlements` hat kein `aps-environment`, `Info.plist` kein `UIBackgroundModes: remote-notification`. Die App kann sich also gar nicht erst bei APNs registrieren.

### Was iOS-Push bräuchte (separates Arbeitspaket, **kein App-Store-Blocker**)
- Apple: **APNs-Auth-Key (.p8)** erstellen (Developer Portal → Keys), Key-ID + Team-ID notieren
- Xcode: Capability **„Push Notifications"** hinzufügen (aktiviert `aps-environment` + App-ID-Capability)
- `Info.plist`: `UIBackgroundModes` → `remote-notification`
- Edge Function `send-push-notification` um einen **APNs-HTTP/2-Zweig** erweitern (JWT mit dem .p8 signieren, an `api.push.apple.com` senden) — für alle `push_subscriptions`-Zeilen mit `device_token`
- Supabase-Secrets: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID=com.evendle.app`

> Apple nimmt die App **auch ohne funktionierendes Push** ab. Wir können iOS-Push nach dem ersten Release nachrüsten. Ich kann den APNs-Zweig der Edge Function bauen, sobald der .p8-Key da ist.

### Kleiner Nebenbefund (nicht dringend)
`push_subscriptions` hat `UNIQUE (user_id, device_token)`, der Native-Code macht aber `upsert(..., { onConflict: 'user_id' })`. Das passt nicht exakt zusammen und war laut Git-Historie schon mehrfach in Arbeit. Sollte beim iOS-Push-Arbeitspaket mitgeräumt werden.
