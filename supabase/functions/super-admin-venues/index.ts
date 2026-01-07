// Super Admin Venues Edge Function
// CRUD operations for venue management
// Only accessible by super admins

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { getUserFromRequest, hasRole, createAuditLog } from "../_shared/auth.ts";

interface CreateVenueRequest {
  name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  timezone?: string;
  settings?: Record<string, any>;
}

interface UpdateVenueRequest {
  name?: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  timezone?: string;
  is_active?: boolean;
  settings?: Record<string, any>;
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

    // Only super admins can manage venues
    if (!hasRole(user, "super_admin")) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions - Super admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const venueId = url.searchParams.get("id");

    // GET - List venues or get specific venue
    if (req.method === "GET") {
      if (venueId) {
        // Get specific venue with stats
        const { data: venue, error } = await supabase
          .from("venues")
          .select("*")
          .eq("id", venueId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch venue: ${error.message}`);
        }

        // Get venue admin count
        const { count: adminCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("venue_id", venueId)
          .eq("role", "venue_admin")
          .eq("is_active", true);

        // Get active registrations count
        const { count: registrationCount } = await supabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("venue_id", venueId)
          .eq("is_archived", false);

        // Get total registrations (all time)
        const { count: totalRegistrations } = await supabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("venue_id", venueId);

        return new Response(
          JSON.stringify({
            success: true,
            venue: {
              ...venue,
              admin_count: adminCount || 0,
              active_registrations: registrationCount || 0,
              total_registrations: totalRegistrations || 0,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List all venues with stats
      const isActive = url.searchParams.get("is_active");
      const search = url.searchParams.get("search");

      let query = supabase.from("venues").select("*");

      if (isActive !== null && isActive !== undefined) {
        query = query.eq("is_active", isActive === "true");
      }
      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      query = query.order("created_at", { ascending: false });

      const { data: venues, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch venues: ${error.message}`);
      }

      // Get stats for each venue
      const venuesWithStats = await Promise.all(
        venues.map(async (venue) => {
          const { count: adminCount } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("venue_id", venue.id)
            .eq("role", "venue_admin")
            .eq("is_active", true);

          const { count: registrationCount } = await supabase
            .from("registrations")
            .select("*", { count: "exact", head: true })
            .eq("venue_id", venue.id)
            .eq("is_archived", false);

          return {
            ...venue,
            admin_count: adminCount || 0,
            active_registrations: registrationCount || 0,
          };
        })
      );

      return new Response(
        JSON.stringify({ success: true, venues: venuesWithStats, total: venuesWithStats.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Create new venue
    if (req.method === "POST") {
      const venueData: CreateVenueRequest = await req.json();

      // Validate required fields
      if (!venueData.name) {
        return new Response(
          JSON.stringify({ error: "Venue name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if venue name already exists
      const { data: existingVenue } = await supabase
        .from("venues")
        .select("id")
        .ilike("name", venueData.name)
        .single();

      if (existingVenue) {
        return new Response(
          JSON.stringify({ error: "Venue name already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create venue
      const { data: newVenue, error: createError } = await supabase
        .from("venues")
        .insert({
          name: venueData.name,
          address: venueData.address || null,
          contact_email: venueData.contact_email || null,
          contact_phone: venueData.contact_phone || null,
          timezone: venueData.timezone || "Europe/London",
          settings: venueData.settings || {},
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create venue: ${createError.message}`);
      }

      // Create default archive settings for the venue
      await supabase.from("venue_archive_settings").insert({
        venue_id: newVenue.id,
        auto_archive_enabled: true,
        archive_after_hours: 24,
      });

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "create_venue",
        "venue",
        newVenue.id,
        { venue: newVenue },
        req
      );

      return new Response(
        JSON.stringify({
          success: true,
          venue: newVenue,
          message: "Venue created successfully",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PATCH - Update venue
    if (req.method === "PATCH") {
      if (!venueId) {
        return new Response(
          JSON.stringify({ error: "Venue ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updates: UpdateVenueRequest = await req.json();

      // Get existing venue
      const { data: existingVenue, error: fetchError } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .single();

      if (fetchError || !existingVenue) {
        return new Response(
          JSON.stringify({ error: "Venue not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update venue
      const { data: updatedVenue, error: updateError } = await supabase
        .from("venues")
        .update(updates)
        .eq("id", venueId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update venue: ${updateError.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "update_venue",
        "venue",
        venueId,
        { before: existingVenue, after: updates },
        req
      );

      return new Response(
        JSON.stringify({ success: true, venue: updatedVenue }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE - Soft delete venue
    if (req.method === "DELETE") {
      if (!venueId) {
        return new Response(
          JSON.stringify({ error: "Venue ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if venue has active admins
      const { count: adminCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("venue_id", venueId)
        .eq("role", "venue_admin")
        .eq("is_active", true);

      if (adminCount && adminCount > 0) {
        return new Response(
          JSON.stringify({
            error: "Cannot delete venue with active admins. Please deactivate admins first.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Soft delete (deactivate)
      const { data: deletedVenue, error: deleteError } = await supabase
        .from("venues")
        .update({ is_active: false })
        .eq("id", venueId)
        .select()
        .single();

      if (deleteError) {
        throw new Error(`Failed to delete venue: ${deleteError.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "delete_venue",
        "venue",
        venueId,
        { venue: deletedVenue },
        req
      );

      return new Response(
        JSON.stringify({ success: true, message: "Venue deactivated successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Super admin venues error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
