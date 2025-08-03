import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the Google Maps API key from Supabase secrets
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    console.log('Looking for GOOGLE_MAPS_API_KEY...', googleMapsApiKey ? 'Found' : 'Not found')
    
    if (!googleMapsApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not found in environment')
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API Key not found in Supabase secrets. Please add GOOGLE_MAPS_API_KEY to your project secrets.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Returning API key successfully')
    return new Response(
      JSON.stringify({ apiKey: googleMapsApiKey }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})