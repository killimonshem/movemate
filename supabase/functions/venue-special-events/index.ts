// Venue Special Events Edge Function
// CRUD operations for special event overrides

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { getUserFromRequest, hasRole, canAccessVenue, createAuditLog } from "../_shared/auth.ts";

interface SpecialEvent {
  id?: string;
  venue_id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
  notes?: string;
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

    // Only venue admins and super admins can manage special events
    if (!hasRole(user, ["venue_admin", "super_admin"])) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const venueId = url.searchParams.get("venue_id");
    const eventId = url.searchParams.get("id");

    // GET - Fetch special events for a venue
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

      // Fetch upcoming events (or all if requested)
      const includeAll = url.searchParams.get("include_past") === "true";

      let query = supabase
        .from("venue_special_events")
        .select("*")
        .eq("venue_id", venueId)
        .order("event_date", { ascending: true });

      if (!includeAll) {
        query = query.gte("event_date", new Date().toISOString().split("T")[0]);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch special events: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, events }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Create new special event
    if (req.method === "POST") {
      const event: SpecialEvent = await req.json();

      // Validate required fields
      if (!event.venue_id || !event.name || !event.event_date || !event.start_time || !event.end_time) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: venue_id, name, event_date, start_time, end_time" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check access permission
      if (!canAccessVenue(user, event.venue_id)) {
        return new Response(
          JSON.stringify({ error: "Access denied to this venue" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert event
      const { data, error } = await supabase
        .from("venue_special_events")
        .insert({
          venue_id: event.venue_id,
          name: event.name,
          event_date: event.event_date,
          start_time: event.start_time,
          end_time: event.end_time,
          is_active: event.is_active !== undefined ? event.is_active : true,
          notes: event.notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation
        if (error.code === "23505") {
          return new Response(
            JSON.stringify({ error: "A special event already exists for this date at this venue" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`Failed to create special event: ${error.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "create_special_event",
        "venue_special_event",
        data.id,
        { event: data },
        req
      );

      return new Response(
        JSON.stringify({ success: true, event: data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT - Update existing special event
    if (req.method === "PUT") {
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: "id parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updates: Partial<SpecialEvent> = await req.json();

      // Get existing event to check venue access
      const { data: existingEvent, error: fetchError } = await supabase
        .from("venue_special_events")
        .select("venue_id")
        .eq("id", eventId)
        .single();

      if (fetchError || !existingEvent) {
        return new Response(
          JSON.stringify({ error: "Special event not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check access permission
      if (!canAccessVenue(user, existingEvent.venue_id)) {
        return new Response(
          JSON.stringify({ error: "Access denied to this venue" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update event
      const { data, error } = await supabase
        .from("venue_special_events")
        .update(updates)
        .eq("id", eventId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update special event: ${error.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "update_special_event",
        "venue_special_event",
        eventId,
        { updates },
        req
      );

      return new Response(
        JSON.stringify({ success: true, event: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE - Delete special event
    if (req.method === "DELETE") {
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: "id parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get event to check venue access
      const { data: existingEvent, error: fetchError } = await supabase
        .from("venue_special_events")
        .select("venue_id")
        .eq("id", eventId)
        .single();

      if (fetchError || !existingEvent) {
        return new Response(
          JSON.stringify({ error: "Special event not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check access permission
      if (!canAccessVenue(user, existingEvent.venue_id)) {
        return new Response(
          JSON.stringify({ error: "Access denied to this venue" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete event
      const { error: deleteError } = await supabase
        .from("venue_special_events")
        .delete()
        .eq("id", eventId);

      if (deleteError) {
        throw new Error(`Failed to delete special event: ${deleteError.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "delete_special_event",
        "venue_special_event",
        eventId,
        { venue_id: existingEvent.venue_id },
        req
      );

      return new Response(
        JSON.stringify({ success: true, message: "Special event deleted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Venue special events error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
