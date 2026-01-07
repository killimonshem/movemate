// Venue Schedules Edge Function
// CRUD operations for venue weekly schedules

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { getUserFromRequest, hasRole, canAccessVenue, createAuditLog } from "../_shared/auth.ts";

interface Schedule {
  id?: string;
  venue_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const user = await getUserFromRequest(req, supabase);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only venue admins and super admins can manage schedules
    if (!hasRole(user, ["venue_admin", "super_admin"])) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const venueId = url.searchParams.get("venue_id");

    // GET - Fetch schedules for a venue
    if (req.method === "GET") {
      if (!venueId) {
        return new Response(
          JSON.stringify({ error: "venue_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check access permission
      if (!canAccessVenue(user, venueId)) {
        return new Response(
          JSON.stringify({ error: "Access denied to this venue" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: schedules, error } = await supabase
        .from("venue_schedules")
        .select("*")
        .eq("venue_id", venueId)
        .order("day_of_week", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch schedules: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, schedules }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Create or update schedule
    if (req.method === "POST") {
      const schedule: Schedule = await req.json();

      // Validate required fields
      if (!schedule.venue_id || schedule.day_of_week === undefined || !schedule.start_time || !schedule.end_time) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: venue_id, day_of_week, start_time, end_time" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate day_of_week
      if (schedule.day_of_week < 0 || schedule.day_of_week > 6) {
        return new Response(
          JSON.stringify({ error: "day_of_week must be between 0 (Sunday) and 6 (Saturday)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check access permission
      if (!canAccessVenue(user, schedule.venue_id)) {
        return new Response(
          JSON.stringify({ error: "Access denied to this venue" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert schedule (insert or update if exists)
      const { data, error } = await supabase
        .from("venue_schedules")
        .upsert({
          venue_id: schedule.venue_id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_active: schedule.is_active !== undefined ? schedule.is_active : true,
          created_by: user.id,
        }, {
          onConflict: "venue_id,day_of_week",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save schedule: ${error.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "upsert_venue_schedule",
        "venue_schedule",
        data.id,
        { schedule: data },
        req
      );

      return new Response(
        JSON.stringify({ success: true, schedule: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE - Delete a schedule
    if (req.method === "DELETE") {
      const scheduleId = url.searchParams.get("id");

      if (!scheduleId) {
        return new Response(
          JSON.stringify({ error: "id parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get schedule to check venue access
      const { data: existingSchedule, error: fetchError } = await supabase
        .from("venue_schedules")
        .select("venue_id")
        .eq("id", scheduleId)
        .single();

      if (fetchError || !existingSchedule) {
        return new Response(
          JSON.stringify({ error: "Schedule not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check access permission
      if (!canAccessVenue(user, existingSchedule.venue_id)) {
        return new Response(
          JSON.stringify({ error: "Access denied to this venue" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete schedule
      const { error: deleteError } = await supabase
        .from("venue_schedules")
        .delete()
        .eq("id", scheduleId);

      if (deleteError) {
        throw new Error(`Failed to delete schedule: ${deleteError.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "delete_venue_schedule",
        "venue_schedule",
        scheduleId,
        { venue_id: existingSchedule.venue_id },
        req
      );

      return new Response(
        JSON.stringify({ success: true, message: "Schedule deleted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Venue schedules error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
