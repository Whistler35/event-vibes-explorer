import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_CATEGORIES = new Set([
  'music', 'sports', 'culture', 'food', 'nightlife',
  'outdoor', 'community', 'workshop', 'other',
])

interface ScrapedEvent {
  title?: string
  description?: string | null
  event_date?: string
  end_time?: string | null
  location_name?: string
  latitude?: number | null
  longitude?: number | null
  image_url?: string | null
  category?: string | null
  source_url?: string | null
}

function isValidIso(s: unknown): s is string {
  return typeof s === 'string' && !Number.isNaN(Date.parse(s))
}

async function uploadImage(
  supabase: SupabaseClient,
  imageUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const buffer = new Uint8Array(await res.arrayBuffer())
    if (buffer.byteLength === 0 || buffer.byteLength > 10 * 1024 * 1024) return null

    const path = `imported/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('event-images')
      .upload(path, buffer, { contentType, upsert: false })
    if (error) return null

    const { data } = supabase.storage.from('event-images').getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET')
    if (!expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let body: { secret?: string; events?: ScrapedEvent[] }
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!body?.secret || body.secret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const events = Array.isArray(body.events) ? body.events : []
    if (events.length === 0) {
      return new Response(
        JSON.stringify({ inserted: 0, skipped: 0, errors: ['No events provided'] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (events.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Batch too large (max 200)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Service-role client to bypass RLS for inserts and storage uploads
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < events.length; i++) {
      const ev = events[i]
      const label = ev?.title ? `"${ev.title}"` : `#${i}`

      try {
        // ---- Validate required fields ----
        if (!ev || typeof ev.title !== 'string' || ev.title.trim().length === 0) {
          errors.push(`${label}: missing title`)
          continue
        }
        if (!isValidIso(ev.event_date)) {
          errors.push(`${label}: invalid event_date`)
          continue
        }
        if (typeof ev.location_name !== 'string' || ev.location_name.trim().length === 0) {
          errors.push(`${label}: missing location_name`)
          continue
        }

        const title = ev.title.trim().slice(0, 500)
        const eventDate = new Date(ev.event_date).toISOString()
        const locationName = ev.location_name.trim().slice(0, 500)
        const description = typeof ev.description === 'string'
          ? ev.description.slice(0, 5000)
          : null
        const endTime = isValidIso(ev.end_time)
          ? new Date(ev.end_time as string).toISOString()
          : null
        const latitude = typeof ev.latitude === 'number' && Number.isFinite(ev.latitude)
          ? ev.latitude
          : null
        const longitude = typeof ev.longitude === 'number' && Number.isFinite(ev.longitude)
          ? ev.longitude
          : null
        const category = typeof ev.category === 'string' && ALLOWED_CATEGORIES.has(ev.category)
          ? ev.category
          : 'other'

        // ---- Deduplicate by title + event_date ----
        const { data: existing, error: dupErr } = await supabase
          .from('events')
          .select('id')
          .eq('title', title)
          .eq('event_date', eventDate)
          .limit(1)
          .maybeSingle()

        if (dupErr) {
          errors.push(`${label}: dedup check failed - ${dupErr.message}`)
          continue
        }
        if (existing) {
          skipped++
          continue
        }

        // ---- Optionally re-host image ----
        let finalImageUrl: string | null = null
        if (typeof ev.image_url === 'string' && ev.image_url.startsWith('http')) {
          finalImageUrl = await uploadImage(supabase, ev.image_url)
          // Fall back to original URL if re-hosting failed
          if (!finalImageUrl) finalImageUrl = ev.image_url
        }

        // ---- Insert ----
        const { error: insErr } = await supabase.from('events').insert({
          title,
          description,
          event_date: eventDate,
          end_time: endTime,
          location_name: locationName,
          latitude,
          longitude,
          image_url: finalImageUrl,
          category,
          source: 'imported',
          approval_status: 'pending',
          visibility: 'public',
          created_by: null,
        })

        if (insErr) {
          errors.push(`${label}: insert failed - ${insErr.message}`)
          continue
        }

        inserted++
      } catch (err) {
        errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return new Response(
      JSON.stringify({ inserted, skipped, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('ingest-scraped-events error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
