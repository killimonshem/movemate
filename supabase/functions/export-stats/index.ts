// Export Stats Edge Function
// Export analytics data to CSV format

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
    const exportType = url.searchParams.get("type") || "registrations";
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

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

    // Default to last 30 days
    const end = endDate || new Date().toISOString().split("T")[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    let csvContent = "";
    let filename = "";

    if (exportType === "registrations") {
      // Export registrations
      const { data: registrations, error } = await supabase
        .from("registrations")
        .select("id, reg, phone, created_at, is_archived")
        .eq("venue_id", venueId)
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch registrations: ${error.message}`);
      }

      // Build CSV
      csvContent = "Registration,Phone,Created At,Status\n";
      registrations?.forEach((reg) => {
        const status = reg.is_archived ? "Archived" : "Active";
        const date = new Date(reg.created_at).toLocaleString("en-GB");
        const phone = reg.phone.substring(0, 7) + "***"; // Mask for privacy
        csvContent += `"${reg.reg}","${phone}","${date}","${status}"\n`;
      });

      filename = `registrations_${start}_to_${end}.csv`;
    } else if (exportType === "notifications") {
      // Export notifications
      const { data: notifications, error } = await supabase
        .from("notification_logs")
        .select("notification_type, recipient_phone, status, created_at, sent_at, response_time_seconds")
        .eq("venue_id", venueId)
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      // Build CSV
      csvContent = "Type,Recipient,Status,Created At,Sent At,Response Time (seconds)\n";
      notifications?.forEach((notif) => {
        const created = new Date(notif.created_at).toLocaleString("en-GB");
        const sent = notif.sent_at ? new Date(notif.sent_at).toLocaleString("en-GB") : "N/A";
        const phone = notif.recipient_phone.substring(0, 7) + "***"; // Mask for privacy
        const responseTime = notif.response_time_seconds || "N/A";
        csvContent += `"${notif.notification_type}","${phone}","${notif.status}","${created}","${sent}","${responseTime}"\n`;
      });

      filename = `notifications_${start}_to_${end}.csv`;
    } else if (exportType === "stats") {
      // Export daily stats
      const { data: stats, error } = await supabase
        .from("venue_stats")
        .select("*")
        .eq("venue_id", venueId)
        .gte("stat_date", start)
        .lte("stat_date", end)
        .order("stat_date", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch stats: ${error.message}`);
      }

      // Build CSV
      csvContent =
        "Date,Total Registrations,Unique Vehicles,New Vehicles,Returning Vehicles,Total Notifications,Delivered,Failed,Avg Response Time (s),Peak Hour,Archived\n";
      stats?.forEach((stat) => {
        csvContent += `"${stat.stat_date}",${stat.total_registrations},${stat.unique_vehicles},${stat.new_vehicles},${stat.returning_vehicles},${stat.total_notifications_sent},${stat.notifications_delivered},${stat.notifications_failed},${stat.avg_response_time_seconds || "N/A"},${stat.peak_hour || "N/A"},${stat.total_archived}\n`;
      });

      filename = `daily_stats_${start}_to_${end}.csv`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid export type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export stats error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
