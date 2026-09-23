# Google-Login auf Android – Status

> Korrektur zu einer früheren, zu vorsichtigen Einschätzung: Android braucht **keinen eigenen
> Google-OAuth-Client und keinen SHA-1-Fingerabdruck**.

## Warum

Der native Login-Flow in `src/pages/Auth.tsx` (`nativeOAuth()`) nutzt **kein natives Google-Sign-In-SDK**.
Stattdessen:

1. Die App generiert selbst ein PKCE-Verifier/Challenge-Paar
2. Öffnet über `@capacitor/browser` den System-Browser mit Supabase's eigenem
   `/auth/v1/authorize`-Endpoint (`SUPABASE_URL/auth/v1/authorize?provider=google&redirect_to=com.evendle.app://login-callback&...`)
3. Google zeigt den Login/Consent-Screen im Browser
4. Nach Erfolg leitet Supabase auf `com.evendle.app://login-callback` weiter
5. Das Betriebssystem öffnet die App über den registrierten URL-Scheme (Intent-Filter)
6. `AuthContext.tsx` fängt das über `@capacitor/app`'s `appUrlOpen` ab und tauscht den Code gegen eine Session

Das ist ein **komplett plattformneutraler Browser+Deep-Link-Flow** — genau derselbe Code läuft auf
iOS und Android identisch. Es gibt keinen Punkt, an dem ein Android-spezifischer OAuth-Client oder
eine App-Signatur (SHA-1) ins Spiel kommt — das wäre nur bei Nutzung des nativen
`GoogleSignIn`-SDKs nötig, das hier nicht verwendet wird.

## Was das für Android bedeutet

| Vorher angenommen | Tatsächlich nötig |
|---|---|
| ~~Eigener Android-OAuth-Client in Google Cloud Console~~ | Nicht nötig |
| ~~SHA-1-Fingerabdruck registrieren~~ | Nicht nötig |
| `com.evendle.app://` als Intent-Filter in `AndroidManifest.xml` registriert | ✅ bereits erledigt |
| Supabase Redirect-URL-Allowlist enthält `com.evendle.app://login-callback` | ✅ bereits vorhanden (gilt plattformübergreifend, ist nicht auf iOS beschränkt) |

**Ergebnis: Google-Login auf Android sollte funktionieren, sobald der erste Android-Build läuft —
ohne weitere Google-Cloud-Schritte.** Das ist etwas, das wir beim ersten echten Gerätetest einfach
ausprobieren und bestätigen, statt vorher extra Konfigurationsarbeit zu investieren.

## Offener Punkt, den es wirklich noch braucht

"Sign in with Apple" auf Android (aktuell ausgeblendet, siehe
[[project_evendle]]) bräuchte **tatsächlich** eine eigene Konfiguration (Apple "Sign in with Apple
for Web" Service-ID + verifizierte Return-URL im Apple Developer Account) — das ist der einzige
noch offene OAuth-Punkt, und wurde bewusst zurückgestellt, da Google-Login als einziger Login-Weg
auf Android erstmal ausreicht.
