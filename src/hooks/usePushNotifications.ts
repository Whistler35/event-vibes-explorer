import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const registeredRef = useRef(false)

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY not set')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false

      const reg = await navigator.serviceWorker.ready

      // Reuse existing sub or create new
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const json = sub.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' }
      )

      if (error) {
        console.error('push_subscriptions upsert:', error)
        return false
      }

      registeredRef.current = true
      return true
    } catch (err) {
      console.error('Push subscribe error:', err)
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return

    await sub.unsubscribe()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', sub.endpoint)
  }, [])

  // Register SW on mount; auto-subscribe if permission already granted
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (registeredRef.current) return

    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then(async () => {
        if (Notification.permission === 'granted') {
          await subscribe()
        }
      })
      .catch((err) => console.error('SW register error:', err))
  }, [subscribe])

  return { subscribe, unsubscribe }
}
