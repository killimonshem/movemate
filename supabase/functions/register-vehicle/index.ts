import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
<<<<<<< Updated upstream

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
=======
import { canAccessVenue, getUserFromRequest, hasRole } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
>>>>>>> Stashed changes

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 405,
        },
      );
    }

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
    )

<<<<<<< Updated upstream
=======
    const user = await getUserFromRequest(req, supabaseClient);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    if (!hasRole(user, ["venue_admin", "super_admin"])) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    if (!canAccessVenue(user, sanitizedVenueId)) {
      return new Response(
        JSON.stringify({ error: "Cannot access this venue" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

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

>>>>>>> Stashed changes
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
    const registrationData: any = {
<<<<<<< Updated upstream
      reg: reg.toUpperCase().replace(/\s/g, ''),
      phone: phone,
      venue_id: venue_id,
      consent_timestamp: new Date().toISOString()
=======
      reg: normalizedReg,
      phone: sanitizedPhone,
      venue_id: sanitizedVenueId,
      consent_timestamp: new Date().toISOString(),
      registered_by: user.id,
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
}) 
=======
})
>>>>>>> Stashed changes
