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
    const { reg, phone, venue_id, vehicle_data } = await req.json()

    if (!reg || !phone || !venue_id) {
      return new Response(
        JSON.stringify({ error: 'Registration, phone, and venue are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

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

    // Check for existing registration for this reg today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    const { data: existing, error: existingError } = await supabaseClient
      .from('registrations')
      .select('id')
      .eq('reg', reg.toUpperCase().replace(/\s/g, ''))
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    if (existingError) throw existingError
    
    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'This vehicle is already registered today' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409,
        },
      )
    }

    // Insert the registration
    const registrationData = {
      reg: reg.toUpperCase().replace(/\s/g, ''),
      phone: phone,
      venue_id: venue_id,
      consent_timestamp: new Date().toISOString()
    }

    if (vehicle_data) {
      registrationData.vehicle_data = vehicle_data
    }

    const { data, error } = await supabaseClient
      .from('registrations')
      .insert([registrationData])
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data }),
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