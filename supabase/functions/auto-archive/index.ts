// Auto-Archive Edge Function
// Scheduled job to archive old registrations across all venues
// Should be triggered by pg_cron or external scheduler (Vercel Cron, GitHub Actions, etc.)

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
    // Verify this is a scheduled/authorized request
    const authHeader = req.headers.get("authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Check authorization (either cron secret or service role key)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid cron secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call database function to run auto-archive for all venues
    const { data: results, error } = await supabase
      .rpc("auto_archive_all_venues");

    if (error) {
      throw new Error(`Auto-archive failed: ${error.message}`);
    }

    // Calculate totals
    const totalArchived = results?.reduce((sum: number, r: any) => sum + (r.archived_count || 0), 0) || 0;
    const venuesProcessed = results?.length || 0;

    // Log results
    console.log(`Auto-archive completed: ${totalArchived} registrations archived across ${venuesProcessed} venues`);

    return new Response(
      JSON.stringify({
        success: true,
        total_archived: totalArchived,
        venues_processed: venuesProcessed,
        results: results,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Auto-archive error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
