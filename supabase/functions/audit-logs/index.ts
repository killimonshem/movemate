// Audit Logs Edge Function
// Fetch audit logs with filtering and pagination
// Only accessible by super admins

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { getUserFromRequest, hasRole } from "../_shared/auth.ts";

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

    // Get authenticated user
    const user = await getUserFromRequest(req, supabase);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only super admins can view audit logs
    if (!hasRole(user, "super_admin")) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions - Super admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const entityType = url.searchParams.get("entity_type");
    const entityId = url.searchParams.get("entity_id");
    const userId = url.searchParams.get("user_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" });

    if (action) query = query.eq("action", action);
    if (entityType) query = query.eq("entity_type", entityType);
    if (entityId) query = query.eq("entity_id", entityId);
    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    // Get user details for logs
    const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))];
    const { data: users } = await supabase
      .from("users")
      .select("id, email, full_name")
      .in("id", userIds);

    const userMap = Object.fromEntries(users?.map((u) => [u.id, u]) || []);

    // Enrich logs with user details
    const enrichedLogs = logs.map((log) => ({
      ...log,
      user: log.user_id && userMap[log.user_id] ? userMap[log.user_id] : null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        logs: enrichedLogs,
        total: count,
        limit,
        offset,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Audit logs error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
