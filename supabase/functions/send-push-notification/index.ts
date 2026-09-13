import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PushPayload {
  title: string
  body?: string
  icon?: string
  badge?: string
  url?: string
  data?: Record<string, unknown>
}

interface RequestBody {
  userId: string
  notification: PushPayload
}

// ─── APNs (native iOS) ──────────────────────────────────────────────────────
// Needs these Edge-Function secrets:
//   APNS_KEY_ID       – 10-char Key ID of the APNs Auth Key
//   APNS_TEAM_ID      – Apple Team ID (7DY4J52V8L)
//   APNS_BUNDLE_ID    – com.evendle.app  (defaults to that)
//   APNS_HOST         – api.push.apple.com (prod, default) | api.sandbox.push.apple.com (dev builds)
// APNS_PRIVATE_KEY (the multi-line .p8 PEM) is NOT a Secret — the Cloud
// Secrets form corrupts multi-line values. It lives in the database instead,
// in public.app_secrets (key='APNS_PRIVATE_KEY'), set via the SQL editor.

const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID')
const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID')
const APNS_BUNDLE_ID = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.evendle.app'
const APNS_HOST = Deno.env.get('APNS_HOST') ?? 'api.push.apple.com'

// Storing the raw "-----BEGIN PRIVATE KEY-----" PEM anywhere in Lovable
// (Secrets form, chat, even the SQL editor) gets it silently corrupted —
// confirmed: the first character was replaced by a stray bullet (U+2022),
// byte-identical, no matter the entry path. Lovable appears to pattern-match
// "looks like a private key" and mangle it everywhere. Workaround: the value
// stored in public.app_secrets is the PEM base64-encoded ONE MORE TIME as a
// plain opaque blob (no recognizable "-----BEGIN"), which doesn't trigger
// whatever is doing this — decode that outer layer here before use.
let cachedPrivateKey: string | null = null
async function getApnsPrivateKey(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  if (cachedPrivateKey) return cachedPrivateKey
  const { data, error } = await supabase
    .from('app_secrets')
    .select('value')
    .eq('key', 'APNS_PRIVATE_KEY')
    .maybeSingle()
  if (error || !data?.value) return null
  cachedPrivateKey = atob(data.value.trim())
  return cachedPrivateKey
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToPkcs8(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')

  // Diagnostics only — never log the key itself, just enough to tell whether
  // the APNS_PRIVATE_KEY secret is malformed (wrong length / stray character)
  // without a fresh archive+redeploy cycle per guess.
  const badCharMatch = b64.match(/[^A-Za-z0-9+/=]/)
  if (badCharMatch) {
    console.error('APNS_PRIVATE_KEY diagnostic: invalid character found', {
      rawLength: pem.length,
      cleanedLength: b64.length,
      badCharCodePoint: badCharMatch[0].codePointAt(0),
      badCharIndex: badCharMatch.index,
    })
  }

  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

let cachedJwt: { token: string; iat: number } | null = null

async function getApnsJwt(privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  // APNs accepts a token for 1h; regenerate at most every ~40 min.
  if (cachedJwt && now - cachedJwt.iat < 40 * 60) return cachedJwt.token

  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID })))
  const claims = b64url(new TextEncoder().encode(JSON.stringify({ iss: APNS_TEAM_ID, iat: now })))
  const signingInput = `${header}.${claims}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(privateKey) as unknown as ArrayBufferView,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput)),
  )
  const token = `${signingInput}.${b64url(sig)}`
  cachedJwt = { token, iat: now }
  return token
}

async function sendApns(
  deviceToken: string,
  n: PushPayload,
  privateKey: string,
): Promise<{ ok: boolean; stale: boolean; status: number; reason?: string }> {
  const jwt = await getApnsJwt(privateKey)
  const payload = {
    aps: {
      alert: { title: n.title, body: n.body ?? '' },
      sound: 'default',
      'mutable-content': 1,
    },
    url: n.url,
    ...(n.data ?? {}),
  }
  const res = await fetch(`https://${APNS_HOST}/3/device/${deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (res.status === 200) return { ok: true, stale: false, status: 200 }
  let reason = ''
  try {
    reason = (await res.json())?.reason ?? ''
  } catch { /* ignore */ }
  // 410 Unregistered, or 400 BadDeviceToken → the token is dead
  const stale = res.status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered'
  return { ok: false, stale, status: res.status, reason }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@evendle.com'
    const webPushConfigured = !!(vapidPublic && vapidPrivate)
    if (webPushConfigured) {
      webpush.setVapidDetails(vapidSubject, vapidPublic!, vapidPrivate!)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const apnsPrivateKey = await getApnsPrivateKey(supabase)
    const apnsConfigured = !!(APNS_KEY_ID && APNS_TEAM_ID && apnsPrivateKey)

    if (!webPushConfigured && !apnsConfigured) {
      return new Response(
        JSON.stringify({ error: 'Neither Web Push (VAPID) nor APNs is configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!body?.userId || typeof body.userId !== 'string') {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!body?.notification || typeof body.notification.title !== 'string') {
      return new Response(
        JSON.stringify({ error: 'notification.title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('id, platform, device_token, endpoint, p256dh, auth')
      .eq('user_id', body.userId)

    if (subsErr) {
      return new Response(JSON.stringify({ error: subsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No push subscriptions for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const n = body.notification
    const webPayload = JSON.stringify(n)
    let sent = 0
    let failed = 0
    const staleIds: string[] = []

    await Promise.all(
      subs.map(async (s: any) => {
        try {
          // Native iOS row (has an APNs device token)
          if (s.device_token) {
            if (!apnsConfigured || !apnsPrivateKey) { failed++; return }
            const r = await sendApns(s.device_token, n, apnsPrivateKey)
            if (r.ok) sent++
            else {
              failed++
              if (r.stale) staleIds.push(s.id)
              console.error('APNs send failed', { status: r.status, reason: r.reason })
            }
            return
          }
          // Web push row (has an endpoint)
          if (s.endpoint) {
            if (!webPushConfigured) { failed++; return }
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              webPayload,
            )
            sent++
            return
          }
          failed++
        } catch (err: any) {
          failed++
          const status = err?.statusCode
          if (status === 404 || status === 410) staleIds.push(s.id)
          console.error('push send failed', { id: s.id, status, message: err?.message })
        }
      }),
    )

    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds)
    }

    return new Response(
      JSON.stringify({ sent, failed, removed_stale: staleIds.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('send-push-notification error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
