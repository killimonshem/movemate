// Auth Logout Edge Function
// Invalidates user session token

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { deleteSession, deleteAllUserSessions, getUserFromRequest } from "../_shared/auth.ts";

interface LogoutRequest {
  logoutAll?: boolean; // If true, logout from all devices
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreFlight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from request token
    const user = await getUserFromRequest(req, supabase);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { logoutAll = false }: LogoutRequest = await req.json().catch(() => ({}));

    // Extract token from authorization header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.substring(7); // Remove "Bearer " prefix

    if (logoutAll) {
      // Logout from all devices
      await deleteAllUserSessions(supabase, user.id);
    } else if (token) {
      // Logout from this device only
      await deleteSession(supabase, token);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: logoutAll ? "Logged out from all devices" : "Logged out successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
