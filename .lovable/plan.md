

## Aktueller Stand

Der Admin-Bereich existiert bereits unter `/admin/events` und ist über das Schild-Icon (🛡️) auf der Profilseite erreichbar. Das Problem: Es gibt keinen visuellen Hinweis, dass neue Anfragen vorliegen — kein Badge, keine Zahl, keine Benachrichtigung.

## Plan

### 1. Pending-Counter Badge am Admin-Icon (Profil-Header)

- Im `Profile.tsx` einen Echtzeit-Counter der pending Events laden (`SELECT count(*) FROM events WHERE approval_status = 'pending'`)
- Am ShieldCheck-Icon ein rotes Badge mit der Anzahl anzeigen (z.B. rote Blase mit "3")
- Nur sichtbar wenn `count > 0`

### 2. Admin-Bereich in der BottomNavigation sichtbar machen

- Optional: Für Admins einen zusätzlichen Nav-Eintrag oder ein Indikator-Dot in der Bottom Navigation hinzufügen, damit man nicht erst zum Profil navigieren muss

### 3. Zusammenfassung des Flows

```text
User erstellt Community Event → Status: pending → Event unsichtbar auf Karte
                                                 ↓
Admin sieht Badge "3" am 🛡️ Icon → klickt → /admin/events
                                                 ↓
                                    Freigeben oder Ablehnen
```

### Technische Details

- Query: `supabase.from('events').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending')` — nutzt den bestehenden Admin-RLS-Policy
- Badge-Komponente: Kleiner roter Kreis mit Zahl, absolut positioniert über dem ShieldCheck-Button
- State via `useState` + `useEffect` im Profile-Component

