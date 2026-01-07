// Venue Status Edge Function
// Check if a venue is currently active and get next active time

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Only allow GET
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const venueId = url.searchParams.get("venue_id");

    if (!venueId) {
      return new Response(
        JSON.stringify({ error: "venue_id parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call database function to check if venue is active
    const { data: isActiveData, error: activeError } = await supabase
      .rpc("is_venue_active_now", { p_venue_id: venueId });

    if (activeError) {
      throw new Error(`Failed to check venue status: ${activeError.message}`);
    }

    const isActive = isActiveData as boolean;

    // Get next active time if not currently active
    let nextActiveTime = null;
    if (!isActive) {
      const { data: nextTimeData, error: nextTimeError } = await supabase
        .rpc("get_next_active_time", { p_venue_id: venueId });

      if (!nextTimeError && nextTimeData) {
        nextActiveTime = nextTimeData;
      }
    }

    // Get venue name and timezone for context
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("name, timezone")
      .eq("id", venueId)
      .single();

    if (venueError) {
      throw new Error(`Failed to fetch venue: ${venueError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        venue_id: venueId,
        venue_name: venue.name,
        timezone: venue.timezone || "Europe/London",
        is_active: isActive,
        next_active_time: nextActiveTime,
        checked_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Venue status error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
