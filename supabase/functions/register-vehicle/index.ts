import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Server-side validation functions
function validateUKReg(reg: string): boolean {
  const pattern = /^[A-Z]{2}[0-9]{2}\s?[A-Z]{3}$|^[A-Z][0-9]{1,3}\s?[A-Z]{3}$|^[A-Z]{3}\s?[0-9]{1,3}[A-Z]$|^[0-9]{1,4}\s?[A-Z]{1,2}$|^[0-9]{1,3}\s?[A-Z]{1,3}$|^[A-Z]{1,2}\s?[0-9]{1,4}$|^[A-Z]{1,3}\s?[0-9]{1,3}$|^[A-Z]{1,3}\s?[0-9]{1,4}$/i
  return pattern.test(reg.replace(/\s/g, ''))
}

function validateUKMobile(phone: string): boolean {
  const pattern = /^(\+44|0)7[0-9]{9}$/
  return pattern.test(phone.replace(/\s/g, ''))
}

function sanitizeInput(input: string, maxLength: number = 255): string {
  return input.trim().substring(0, maxLength)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reg, phone, venue_id, vehicle_data } = await req.json()

    // Validate required fields
    if (!reg || !phone || !venue_id) {
      return new Response(
        JSON.stringify({ error: 'Registration, phone, and venue are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Sanitize inputs
    const sanitizedReg = sanitizeInput(reg, 20)
    const sanitizedPhone = sanitizeInput(phone, 20)
    const sanitizedVenueId = sanitizeInput(venue_id, 100)

    // Validate UK registration format
    if (!validateUKReg(sanitizedReg)) {
      return new Response(
        JSON.stringify({ error: 'Invalid UK registration format' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate UK mobile format
    if (!validateUKMobile(sanitizedPhone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid UK mobile number format' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate venue_id is a valid UUID or string
    if (sanitizedVenueId.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid venue identifier' }),
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
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    )

    // Verify venue exists
    const { data: venueExists, error: venueError } = await supabaseClient
      .from('venues')
      .select('id')
      .eq('id', sanitizedVenueId)
      .maybeSingle()

    if (venueError || !venueExists) {
      return new Response(
        JSON.stringify({ error: 'Invalid venue' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Check for existing registration for this reg today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const normalizedReg = sanitizedReg.toUpperCase().replace(/\s/g, '')

    const { data: existing, error: existingError } = await supabaseClient
      .from('registrations')
      .select('id')
      .eq('reg', normalizedReg)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    if (existingError) {
      console.error('Database error checking existing registration:', existingError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify registration status' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

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
    const registrationData: any = {
      reg: normalizedReg,
      phone: sanitizedPhone,
      venue_id: sanitizedVenueId,
      consent_timestamp: new Date().toISOString()
    }

    // Sanitize and validate vehicle_data if provided
    if (vehicle_data && typeof vehicle_data === 'object') {
      // Only include safe fields from vehicle_data
      const safeVehicleData: any = {}
      const allowedFields = ['make', 'model', 'colour', 'year', 'fuelType', 'co2Emissions']

      for (const field of allowedFields) {
        if (vehicle_data[field] !== undefined) {
          safeVehicleData[field] = typeof vehicle_data[field] === 'string'
            ? sanitizeInput(vehicle_data[field], 100)
            : vehicle_data[field]
        }
      }

      registrationData.vehicle_data = safeVehicleData
    }

    const { data, error } = await supabaseClient
      .from('registrations')
      .insert([registrationData])
      .select()

    if (error) {
      console.error('Database error inserting registration:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to register vehicle' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})