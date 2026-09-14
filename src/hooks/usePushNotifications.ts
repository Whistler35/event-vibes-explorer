import { useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

// TEMPORARY: on-screen push-registration diagnostics for the native rollout.
// Flip PUSH_DEBUG to true locally if push registration needs debugging again.
const PUSH_DEBUG = false
function pushDebug(msg: string) {
  console.log('[push-debug]', msg)
  if (PUSH_DEBUG) toast(`Push: ${msg}`, { duration: 8000 })
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
const IS_NATIVE = Capacitor.isNativePlatform()

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Returns current position silently (no error thrown, returns null on failure)
function getCurrentPosition(): Promise<GeolocationCoordinates | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => resolve(null),
      { maximumAge: 300_000, timeout: 10_000 }
    )
  })
}

// ─── Native path (APNs / FCM via @capacitor/push-notifications) ─────────────

async function subscribeNative(): Promise<boolean> {
  pushDebug('subscribeNative() gestartet')
  const { PushNotifications } = await import('@capacitor/push-notifications')

  const { receive } = await PushNotifications.requestPermissions()
  pushDebug(`requestPermissions() → ${receive}`)
  if (receive !== 'granted') return false

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pushDebug('TIMEOUT nach 10s — weder registration noch registrationError kam an')
      resolve(false)
    }, 10_000)

    PushNotifications.addListener('registration', async ({ value: token }) => {
      clearTimeout(timer)
      pushDebug(`registration OK, Token: ${token.slice(0, 12)}…`)
      const [userId, coords] = await Promise.all([getUserId(), getCurrentPosition()])
      if (!userId) { pushDebug('kein eingeloggter userId — abgebrochen'); resolve(false); return }

      // A user may have several devices; the unique key is (user_id, device_token).
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id:      userId,
        platform:     Capacitor.getPlatform(),
        device_token: token,
        latitude:     coords?.latitude  ?? null,
        longitude:    coords?.longitude ?? null,
        user_agent:   navigator.userAgent,
      }, { onConflict: 'user_id,device_token' })
      if (error) {
        console.error('push_subscriptions upsert (native):', error)
        pushDebug(`DB-Upsert FEHLGESCHLAGEN: ${error.message}`)
      } else {
        pushDebug('Token erfolgreich in push_subscriptions gespeichert ✅')
      }
      resolve(!error)
    })

    PushNotifications.addListener('registrationError', ({ error }) => {
      clearTimeout(timer)
      console.error('Capacitor push registration error:', error)
      pushDebug(`registrationError: ${JSON.stringify(error)}`)
      resolve(false)
    })

    PushNotifications.register()
    pushDebug('register() aufgerufen, warte auf Antwort…')
  })
}

async function unsubscribeNative(): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('platform', Capacitor.getPlatform())
}

// ─── Web path (Web Push API via ServiceWorker + VAPID) ───────────────────────

async function subscribeWeb(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY not set')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }

    const json = sub.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

    const [userId, coords] = await Promise.all([getUserId(), getCurrentPosition()])
    if (!userId) return false

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id:    userId,
      platform:   'web',
      endpoint:   json.endpoint,
      p256dh:     json.keys.p256dh,
      auth:       json.keys.auth,
      latitude:   coords?.latitude  ?? null,
      longitude:  coords?.longitude ?? null,
      user_agent: navigator.userAgent,
    }, { onConflict: 'endpoint' })
    if (error) console.error('push_subscriptions upsert (web):', error)
    return !error
  } catch (err) {
    console.error('subscribeWeb error:', err)
    return false
  }
}

async function unsubscribeWeb(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return

  await sub.unsubscribe()
  const userId = await getUserId()
  if (!userId) return
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', sub.endpoint)
}

// ─── Location update (called silently on every app open) ─────────────────────

async function updateLocation(): Promise<void> {
  const userId = await getUserId()
  if (!userId) return

  const coords = await getCurrentPosition()
  if (!coords) return

  await supabase
    .from('push_subscriptions')
    .update({
      latitude:   coords.latitude,
      longitude:  coords.longitude,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePushNotifications() {
  const registeredRef = useRef(false)

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      return await (IS_NATIVE ? subscribeNative() : subscribeWeb())
    } catch (err) {
      console.error('Push subscribe error:', err)
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      await (IS_NATIVE ? unsubscribeNative() : unsubscribeWeb())
    } catch (err) {
      console.error('Push unsubscribe error:', err)
    }
  }, [])

  const refreshLocation = useCallback(async (): Promise<void> => {
    try {
      await updateLocation()
    } catch { /* silent */ }
  }, [])

  // Web only: register SW on mount; auto-subscribe if permission already granted
  useEffect(() => {
    if (IS_NATIVE) return
    if (!('serviceWorker' in navigator)) return
    if (registeredRef.current) return

    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then(async () => {
        registeredRef.current = true
        if (Notification.permission === 'granted') {
          await subscribeWeb()
        }
      })
      .catch((err) => console.error('SW register error:', err))
  }, [])

  return { subscribe, unsubscribe, refreshLocation }
}
