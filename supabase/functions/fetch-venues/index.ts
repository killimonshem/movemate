import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { getUserFromRequest, hasRole } from "../_shared/auth.ts";

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

    if (user.role === "venue_admin" && !user.venue_id) {
      return new Response(
        JSON.stringify({ error: "Venue admin is not assigned to a venue" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let query = supabaseClient
      .from("venues")
      .select("id, name, is_active, timezone")
      .order("name", { ascending: true });

    if (user.role === "venue_admin" && user.venue_id) {
      query = query.eq("id", user.venue_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return new Response(
      JSON.stringify({ data }),
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
