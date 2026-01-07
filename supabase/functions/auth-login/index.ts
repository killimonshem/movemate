// Auth Login Edge Function
// Handles email/password authentication for all user roles

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { verifyPassword, hashPassword } from "../_shared/password.ts";
import { createSession } from "../_shared/auth.ts";

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
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

    // Parse request body
    const { email, password, rememberMe = false }: LoginRequest = await req.json();

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, password_hash, full_name, role, venue_id, is_active")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return new Response(
        JSON.stringify({ error: "Account is deactivated. Contact administrator." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password
    const { isValid, needsUpgrade } = await verifyPassword(
      password,
      user.password_hash
    );

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If password needs upgrade from SHA-256 to bcrypt, do it now
    if (needsUpgrade) {
      const newHash = await hashPassword(password);
      await supabase
        .from("users")
        .update({ password_hash: newHash })
        .eq("id", user.id);
    }

    // Update last login timestamp
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    // Create session (24 hours normal, 30 days if remember me)
    const expiresInHours = rememberMe ? 24 * 30 : 24;
    const session = await createSession(supabase, user.id, req, expiresInHours);

    // Return success with session token
    return new Response(
      JSON.stringify({
        success: true,
        session: {
          token: session.token,
          expires_at: session.expires_at,
        },
        user: {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.full_name,
          role: session.user.role,
          venue_id: session.user.venue_id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
