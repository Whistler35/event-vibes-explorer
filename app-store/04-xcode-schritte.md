# Xcode – Signierung & Upload (Schritt für Schritt)

Diese Schritte kann nur jemand mit deinem Apple-Login machen. Ich habe das Projekt so vorbereitet,
dass „Automatic Signing" reicht – du musst nur deinen Account einmalig hinzufügen.

## Projekt öffnen

Im Terminal (im Projektordner):

```bash
npx cap open ios
```

Das öffnet `ios/App/App.xcworkspace` in Xcode. **Immer das `.xcworkspace` öffnen, nie das `.xcodeproj`.**

## 1. Apple-Account in Xcode hinterlegen (einmalig)

1. Xcode-Menü → **Settings…** (⌘,) → Tab **Accounts**
2. Unten links **+** → **Apple ID** → mit deiner Apple-ID einloggen (die mit der bezahlten Developer-Mitgliedschaft)
3. Nach dem Login erscheint dein Team: **„Benjamin Maxwald (Individual)"**, Team ID **`7DY4J52V8L`**
4. Fenster schließen

## 2. Signierung einschalten

1. Im Projekt-Navigator links auf **App** (blaues Icon ganz oben) klicken
2. In der Mitte: **TARGETS → App** auswählen
3. Tab **Signing & Capabilities**
4. **☑ Automatically manage signing** anhaken
5. Bei **Team** dein Team auswählen
6. **Bundle Identifier** muss `com.evendle.app` sein (ist schon gesetzt)
7. Xcode legt jetzt automatisch das Signing-Zertifikat und ein Provisioning-Profil an.
   Falls „com.evendle.app" noch nicht registriert ist, macht Xcode das mit einem Klick („Try Again"/„Register").

Wenn unter „Signing" ein grüner Haken bzw. keine roten Fehler stehen: passt. ✅

## 3. Capabilities prüfen

Im selben Tab **Signing & Capabilities** sollten diese „Capabilities" stehen (per **+ Capability** hinzufügen, falls nicht):

- **Sign in with Apple**  (Pflicht – Login-Funktion)
- **Push Notifications**  (für die Benachrichtigungen)

> Für Push brauchst du zusätzlich einmalig einen **APNs-Auth-Key** im Apple Developer Portal
> (Certificates, Identifiers & Profiles → Keys → +). Den Key (.p8) hinterlegst du später bei deinem
> Push-Dienst. Für die reine App-Store-Freigabe ist der Key nicht zwingend – die App wird auch ohne
> funktionierendes Push abgenommen. Wir können das nach dem ersten Release nachziehen.

## 4. Gerät/Ziel wählen

Oben in der Leiste als Ziel **„Any iOS Device (arm64)"** wählen (nicht Simulator – sonst ist „Archive" ausgegraut).

## 5. Archive erstellen

1. Menü **Product → Archive**
2. Der Build läuft (2–5 Min). Danach öffnet sich der **Organizer** mit dem Archiv.
3. Falls Fehler: Text kopieren und mir schicken.

## 6. Zu App Store Connect hochladen

1. Im Organizer das neue Archiv auswählen → **Distribute App**
2. **App Store Connect** → **Upload** → Weiter mit den Standard-Optionen
   („Upload your app's symbols" an, „Manage Version and Build Number" an)
3. Signierung: **Automatically manage signing**
4. **Upload**. Nach ein paar Minuten ist der Build in App Store Connect sichtbar
   (unter TestFlight bzw. bei der Version als „Build auswählen"). Es kann 5–30 Min dauern,
   bis er „fertig verarbeitet" ist.

## Häufige Stolpersteine

| Meldung | Lösung |
|---------|--------|
| „No account for team" | Schritt 1 nicht gemacht / falsche Apple-ID |
| „Failed to register bundle identifier" | In App Store Connect ist `com.evendle.app` evtl. schon von einem anderen Team belegt – dann Bundle-ID anpassen (z. B. `com.evendle.ios`) und mir sagen, ich ändere es überall |
| „Cannot code sign because the provisioning profile does not include the Sign in with Apple / Push entitlement" | Capability (Schritt 3) fehlt oder Portal-Sync nötig → in Xcode „Try Again" bei Signing |
| Archive ausgegraut | Ziel steht auf Simulator statt „Any iOS Device" |
| Upload-Fehler „Invalid Swift Support" o. ä. | Nochmal `npm run build && npx cap sync ios`, dann Clean Build Folder (⇧⌘K) und erneut Archive |
