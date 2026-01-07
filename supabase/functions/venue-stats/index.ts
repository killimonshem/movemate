// Venue Stats Edge Function
// Fetch analytics and statistics for dashboard

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { getUserFromRequest, canAccessVenue } from "../_shared/auth.ts";

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

    const url = new URL(req.url);
    const venueId = url.searchParams.get("venue_id");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const statsType = url.searchParams.get("type") || "summary";

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

    // Default to last 30 days if not specified
    const end = endDate || new Date().toISOString().split("T")[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Fetch different types of stats based on request
    if (statsType === "summary") {
      // Get aggregate summary
      const { data: summary, error: summaryError } = await supabase
        .rpc("get_venue_stats_summary", {
          p_venue_id: venueId,
          p_start_date: start,
          p_end_date: end,
        })
        .single();

      if (summaryError) {
        throw new Error(`Failed to fetch summary: ${summaryError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, summary }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (statsType === "daily") {
      // Get daily breakdown
      const { data: dailyStats, error: dailyError } = await supabase
        .from("venue_stats")
        .select("*")
        .eq("venue_id", venueId)
        .gte("stat_date", start)
        .lte("stat_date", end)
        .order("stat_date", { ascending: true });

      if (dailyError) {
        throw new Error(`Failed to fetch daily stats: ${dailyError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, daily_stats: dailyStats }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (statsType === "registrations") {
      // Get registration trends
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("id, reg, phone, created_at, vehicle_data")
        .eq("venue_id", venueId)
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (regError) {
        throw new Error(`Failed to fetch registrations: ${regError.message}`);
      }

      // Group by date
      const byDate: Record<string, number> = {};
      const byHour: Record<number, number> = {};

      registrations?.forEach((reg) => {
        const date = new Date(reg.created_at).toISOString().split("T")[0];
        const hour = new Date(reg.created_at).getHours();

        byDate[date] = (byDate[date] || 0) + 1;
        byHour[hour] = (byHour[hour] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          success: true,
          registrations: {
            total: registrations?.length || 0,
            by_date: byDate,
            by_hour: byHour,
            recent: registrations?.slice(0, 10),
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (statsType === "notifications") {
      // Get notification stats
      const { data: notifications, error: notifError } = await supabase
        .from("notification_logs")
        .select("*")
        .eq("venue_id", venueId)
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (notifError) {
        throw new Error(`Failed to fetch notifications: ${notifError.message}`);
      }

      // Calculate metrics
      const total = notifications?.length || 0;
      const sent = notifications?.filter((n) => n.status === "sent" || n.status === "delivered").length || 0;
      const failed = notifications?.filter((n) => n.status === "failed").length || 0;
      const avgResponseTime =
        notifications
          ?.filter((n) => n.response_time_seconds != null)
          .reduce((sum, n) => sum + (n.response_time_seconds || 0), 0) /
        (notifications?.filter((n) => n.response_time_seconds != null).length || 1);

      const byType: Record<string, number> = {};
      notifications?.forEach((n) => {
        byType[n.notification_type] = (byType[n.notification_type] || 0) + 1;
      });

      return new Response(
        JSON.stringify({
          success: true,
          notifications: {
            total,
            sent,
            failed,
            success_rate: total > 0 ? (sent / total) * 100 : 0,
            avg_response_time_seconds: Math.round(avgResponseTime) || 0,
            by_type: byType,
            recent: notifications?.slice(0, 10),
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (statsType === "top_vehicles") {
      // Get most frequent vehicles
      const { data: vehicles, error: vehicleError } = await supabase
        .from("registrations")
        .select("reg")
        .eq("venue_id", venueId)
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`);

      if (vehicleError) {
        throw new Error(`Failed to fetch vehicles: ${vehicleError.message}`);
      }

      // Count occurrences
      const counts: Record<string, number> = {};
      vehicles?.forEach((v) => {
        const masked = v.reg.substring(0, 3) + "***"; // Mask for privacy
        counts[masked] = (counts[masked] || 0) + 1;
      });

      const topVehicles = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([reg, count]) => ({ reg, count }));

      return new Response(
        JSON.stringify({
          success: true,
          top_vehicles: topVehicles,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid stats type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Venue stats error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
