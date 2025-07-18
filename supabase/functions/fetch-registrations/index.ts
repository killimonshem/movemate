import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const url = new URL(req.url)
    const venueId = url.searchParams.get('venue_id')

    // Create a Supabase client with the service role key (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Build query
    let query = supabaseClient
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Filter by venue if provided
    if (venueId) {
      query = query.eq('venue_id', venueId)
    }
    
    const { data, error } = await query

    if (error) throw error

    // Sanitize and validate data
    const registrationsData = (data || []).map(reg => ({
      id: reg.id,
      reg: reg.reg || '',
      phone: reg.phone || '',
      venue_id: reg.venue_id || '',
      created_at: reg.created_at || new Date().toISOString(),
      consent_timestamp: reg.consent_timestamp || null
    })).filter(reg => reg.reg && reg.phone)

    return new Response(
      JSON.stringify({ data: registrationsData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
}) 