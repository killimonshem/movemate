// Compute Stats Edge Function
// Scheduled job to compute and cache venue statistics
// Should be triggered by pg_cron or external scheduler

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
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify this is a scheduled/authorized request
    const authHeader = req.headers.get("authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Fail closed if CRON_SECRET is not configured
    if (!cronSecret) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: CRON_SECRET is missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid cron secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const venueId = url.searchParams.get("venue_id");
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (venueId) {
      // Compute for specific venue
      const { data: result, error } = await supabase
        .rpc("compute_venue_stats", {
          p_venue_id: venueId,
          p_date: date,
        });

      if (error) {
        throw new Error(`Failed to compute stats: ${error.message}`);
      }

      console.log(`Stats computed for venue ${venueId} on ${date}`);

      return new Response(
        JSON.stringify({
          success: true,
          venue_id: venueId,
          date,
          stat_id: result,
          message: "Stats computed successfully",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Compute for all venues
      const { data: result, error } = await supabase
        .rpc("compute_all_venue_stats", {
          p_date: date,
        });

      if (error) {
        throw new Error(`Failed to compute all stats: ${error.message}`);
      }

      console.log(`Stats computed for ${result} venues on ${date}`);

      return new Response(
        JSON.stringify({
          success: true,
          date,
          venues_processed: result,
          message: `Stats computed for ${result} venues`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Compute stats error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
