import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface SearchParams {
  bbox?: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number }
  radius?: { lat: number; lng: number; meters: number }
  category?: string
  source?: string
  date_from?: string
  date_to?: string
  text?: string
  limit?: number
  offset?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const params: SearchParams = req.method === 'POST' ? await req.json() : {}
    const limit = Math.min(params.limit || 50, 200)
    const offset = params.offset || 0

    // Start with base query - service role bypasses RLS, so we filter visibility manually
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('visibility', 'public')
      .eq('approval_status', 'approved')
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (params.category) {
      query = query.eq('category', params.category)
    }
    if (params.source) {
      query = query.eq('source', params.source)
    }
    if (params.date_from) {
      query = query.gte('event_date', params.date_from)
    }
    if (params.date_to) {
      query = query.lte('event_date', params.date_to)
    }
    if (params.text) {
      query = query.or(`title.ilike.%${params.text}%,description.ilike.%${params.text}%`)
    }

    const { data, error, count } = await query

    if (error) throw error

    // Apply geo filters client-side for now (PostGIS RPC functions will be added via migration)
    let filteredData = data || []

    if (params.bbox) {
      const { sw_lat, sw_lng, ne_lat, ne_lng } = params.bbox
      // Try PostGIS RPC first, fallback to lat/lng filtering
      const { data: geoData, error: geoError } = await supabase.rpc('search_events_bbox', {
        sw_lat, sw_lng, ne_lat, ne_lng,
      })
      if (!geoError && geoData) {
        const geoIds = new Set(geoData.map((r: any) => r.id))
        filteredData = filteredData.filter(e => geoIds.has(e.id))
      } else {
        // Fallback: simple lat/lng bounding box
        filteredData = filteredData.filter(e =>
          e.latitude != null && e.longitude != null &&
          e.latitude >= sw_lat && e.latitude <= ne_lat &&
          e.longitude >= sw_lng && e.longitude <= ne_lng
        )
      }
    }

    if (params.radius) {
      const { lat, lng, meters } = params.radius
      const { data: geoData, error: geoError } = await supabase.rpc('search_events_radius', {
        center_lat: lat, center_lng: lng, radius_meters: meters,
      })
      if (!geoError && geoData) {
        const geoIds = new Set(geoData.map((r: any) => r.id))
        filteredData = filteredData.filter(e => geoIds.has(e.id))
      } else {
        // Fallback: Haversine approximation
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