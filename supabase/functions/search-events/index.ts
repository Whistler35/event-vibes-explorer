import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface SearchParams {
  bbox?: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number }
  radius?: { lat: number; lng: number; meters: number }
  category?: string
  categories?: string[]
  source?: string
  date_from?: string
  date_to?: string
  text?: string
  free_only?: boolean
  limit?: number
  offset?: number
}

const ALLOWED_CATEGORIES = new Set([
  'music', 'sports', 'culture', 'food', 'nightlife',
  'outdoor', 'community', 'workshop', 'other',
])
const ALLOWED_SOURCES = new Set(['curated', 'imported', 'community'])

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function isValidIsoDate(s: unknown): s is string {
  return typeof s === 'string' && s.length <= 64 && !Number.isNaN(Date.parse(s))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use ANON key so RLS applies — public events are already readable
    // by the "Public can view approved visible events" policy.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    let raw: unknown = {}
    if (req.method === 'POST') {
      try {
        raw = await req.json()
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    const params = (raw ?? {}) as SearchParams

    // ---- Validate & sanitize inputs ----
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200)
    const offset = Math.max(Number(params.offset) || 0, 0)

    let categories: string[] | undefined
    if (Array.isArray(params.categories)) {
      categories = params.categories
        .filter((c): c is string => typeof c === 'string')
        .filter((c) => ALLOWED_CATEGORIES.has(c))
        .slice(0, 20)
      if (categories.length === 0) categories = undefined
    }
    const category =
      !categories && typeof params.category === 'string' && ALLOWED_CATEGORIES.has(params.category)
        ? params.category
        : undefined

    const source =
      typeof params.source === 'string' && ALLOWED_SOURCES.has(params.source)
        ? params.source
        : undefined

    let dateFrom = isValidIsoDate(params.date_from) ? params.date_from : undefined
    let dateTo = isValidIsoDate(params.date_to) ? params.date_to : undefined
    // Default: if no date filter provided at all, restrict to events of the current
    // calendar week (Monday 00:00 to Sunday 23:59:59).
    if (!dateFrom && !dateTo) {
      const now = new Date()
      const day = now.getDay() // 0=Sun..6=Sat
      const diffToMonday = (day + 6) % 7
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0)
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59)
      dateFrom = monday.toISOString()
      dateTo = sunday.toISOString()
    }

    // Sanitize free-text search: strip PostgREST filter syntax chars and cap length
    let safeText: string | undefined
    if (typeof params.text === 'string' && params.text.trim().length > 0) {
      safeText = params.text
        .trim()
        .slice(0, 200)
        .replace(/[(),*%]/g, '')
        .replace(/\s+/g, ' ')
      if (safeText.length === 0) safeText = undefined
    }

    // Validate bbox / radius numerics
    let bbox: SearchParams['bbox']
    if (params.bbox &&
        isFiniteNumber(params.bbox.sw_lat) && isFiniteNumber(params.bbox.sw_lng) &&
        isFiniteNumber(params.bbox.ne_lat) && isFiniteNumber(params.bbox.ne_lng)) {
      bbox = params.bbox
    }
    let radius: SearchParams['radius']
    if (params.radius &&
        isFiniteNumber(params.radius.lat) && isFiniteNumber(params.radius.lng) &&
        isFiniteNumber(params.radius.meters) && params.radius.meters > 0 &&
        params.radius.meters <= 500_000) {
      radius = params.radius
    }

    // Build query — RLS already restricts to public+approved rows
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('visibility', 'public')
      .eq('approval_status', 'approved')
      .eq('archived', false)
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1)

    if (categories && categories.length > 0) {
      query = query.in('category', categories)
    } else if (category) {
      query = query.eq('category', category)
    }
    if (source) query = query.eq('source', source)
    if (dateFrom) query = query.gte('event_date', dateFrom)
    if (dateTo) query = query.lte('event_date', dateTo)
    if (params.free_only === true) query = query.eq('price_cents', 0)
    if (safeText) {
      query = query.or(
        `title.ilike.%${safeText}%,description.ilike.%${safeText}%`
      )
    }

    const { data, error, count } = await query
    if (error) throw error

    let filteredData = data || []

    if (bbox) {
      const { sw_lat, sw_lng, ne_lat, ne_lng } = bbox
      const { data: geoData, error: geoError } = await supabase.rpc('search_events_bbox', {
        sw_lat, sw_lng, ne_lat, ne_lng,
      })
      if (!geoError && geoData) {
        const geoIds = new Set(geoData.map((r: any) => r.id))
        filteredData = filteredData.filter(e => geoIds.has(e.id))
      } else {
        filteredData = filteredData.filter(e =>
          e.latitude != null && e.longitude != null &&
          e.latitude >= sw_lat && e.latitude <= ne_lat &&
          e.longitude >= sw_lng && e.longitude <= ne_lng
        )
      }
    }

    if (radius) {
      const { lat, lng, meters } = radius
      const { data: geoData, error: geoError } = await supabase.rpc('search_events_radius', {
        center_lat: lat, center_lng: lng, radius_meters: meters,
      })
      if (!geoError && geoData) {
        const geoIds = new Set(geoData.map((r: any) => r.id))
        filteredData = filteredData.filter(e => geoIds.has(e.id))
      } else {
        const toRad = (deg: number) => deg * Math.PI / 180
        filteredData = filteredData.filter(e => {
          if (e.latitude == null || e.longitude == null) return false
          const R = 6371000
          const dLat = toRad(e.latitude - lat)
          const dLng = toRad(e.longitude - lng)
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat)) * Math.cos(toRad(e.latitude)) *
            Math.sin(dLng / 2) ** 2
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          return dist <= meters
        })
      }
    }

    return new Response(
      JSON.stringify({
        data: filteredData,
        total: count,
        limit,
        offset,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Search events error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
