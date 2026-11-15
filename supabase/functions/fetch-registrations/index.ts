import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { canAccessVenue, getUserFromRequest, hasRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL(req.url);
    const requestedVenueId = url.searchParams.get("venue_id");
    const limitParam = Number(url.searchParams.get("limit") || "200");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 200;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const user = await getUserFromRequest(req, supabaseClient);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!hasRole(user, ["venue_admin", "super_admin"])) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const venueId =
      user.role === "venue_admin" ? user.venue_id : requestedVenueId;

    if (!venueId) {
      return new Response(
        JSON.stringify({ error: "venue_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!canAccessVenue(user, venueId)) {
      return new Response(
        JSON.stringify({ error: "Cannot access this venue" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await supabaseClient
      .from("registrations")
      .select("id, reg, phone, venue_id, created_at, consent_timestamp, is_archived")
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const registrationsData = (data || [])
      .map((reg) => ({
        id: reg.id,
        reg: reg.reg || "",
        phone: reg.phone || "",
        venue_id: reg.venue_id || "",
        created_at: reg.created_at || new Date().toISOString(),
        consent_timestamp: reg.consent_timestamp || null,
        is_archived: Boolean(reg.is_archived),
      }))
      .filter((reg) => reg.reg && reg.phone);

    return new Response(
      JSON.stringify({ data: registrationsData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
