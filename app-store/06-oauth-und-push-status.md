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
| **iOS-App (APNs)** | 🟡 Code jetzt fertig, 3 Schritte von dir offen | siehe unten |

### Was ich schon gebaut habe (09.09.2026)
1. **APNs-Sendecode** in `supabase/functions/send-push-notification/index.ts` – neuer Zweig:
   signiert ein ES256-JWT mit dem .p8-Key und schickt die Nachricht per HTTP/2 an
   `api.push.apple.com/3/device/<token>`. Web-Push bleibt unverändert. Tote Tokens
   (410 / BadDeviceToken) werden automatisch aus `push_subscriptions` gelöscht.
2. **Bug gefixt** in `src/hooks/usePushNotifications.ts`: das Speichern der Push-Anmeldung
   nutzte einen `onConflict`-Schlüssel, den es in der DB nicht gibt (`user_id`) →
   Anmeldung schlug still fehl. Jetzt: nativ `user_id,device_token`, Web `endpoint`.

### Was noch von dir / Jakob kommen muss
| # | Wo | Aktion |
|---|----|--------|
| P1 | **Apple Developer Portal** → Certificates, IDs & Profiles → **Keys** → **+** | Neuen Key mit **„Apple Push Notifications service (APNs)"** anlegen. Die Datei `AuthKey_XXXXXXXXXX.p8` **einmalig herunterladen** (geht nur einmal!) und die **Key-ID** (10 Zeichen) notieren. |
| P2 | **Apple Developer Portal** → Identifiers → App-ID `com.evendle.app` | Capability **„Push Notifications"** aktivieren (Häkchen, Save). |
| P3 | **Xcode** → Target „App" → Signing & Capabilities → **+ Capability** | **„Push Notifications"** hinzufügen. Das schreibt `aps-environment` in `App.entitlements`. **Erst danach** lässt sich mit aktivem Push signieren. |
| P4 | **Supabase** → Edge Functions → **Secrets** | Setzen: `APNS_KEY_ID` = Key-ID aus P1 · `APNS_TEAM_ID` = `7DY4J52V8L` · `APNS_PRIVATE_KEY` = **kompletter Inhalt der .p8-Datei** (mit `-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----`) · `APNS_BUNDLE_ID` = `com.evendle.app` · `APNS_HOST` = `api.push.apple.com` |
| P5 | Edge Function neu deployen | Lovable oder Jakob deployt `send-push-notification` neu, damit der neue Code live ist. |

> Reihenfolge egal, aber alle 5 müssen erledigt sein, damit iOS-Push geht.
> **Sandbox-Hinweis:** Ein Build direkt aus Xcode aufs eigene iPhone nutzt die APNs-**Sandbox**
> (`APNS_HOST = api.sandbox.push.apple.com`). Ein Build aus TestFlight/App Store nutzt **Produktion**
> (`api.push.apple.com`). Zum Testen auf dem eigenen Gerät ggf. `APNS_HOST` temporär umstellen.

### Web-Push
Unverändert vorhanden; braucht `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` als Edge-Function-Secrets (→ B4).
