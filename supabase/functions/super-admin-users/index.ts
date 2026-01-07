// Super Admin Users Edge Function
// CRUD operations for user management (venue admins, users)
// Only accessible by super admins

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { getUserFromRequest, hasRole, createAuditLog } from "../_shared/auth.ts";
import { hashPassword, validatePasswordStrength } from "../_shared/password.ts";

interface CreateUserRequest {
  email: string;
  full_name: string;
  role: "user" | "venue_admin" | "super_admin";
  venue_id?: string;
  password?: string;
  send_invite?: boolean;
}

interface UpdateUserRequest {
  full_name?: string;
  role?: string;
  venue_id?: string;
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

    // Only super admins can manage users
    if (!hasRole(user, "super_admin")) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions - Super admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("id");

    // GET - List users with filters
    if (req.method === "GET") {
      if (userId) {
        // Get specific user
        const { data: targetUser, error } = await supabase
          .from("users")
          .select("id, email, full_name, role, venue_id, is_active, last_login_at, created_at")
          .eq("id", userId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch user: ${error.message}`);
        }

        // Get venue name if venue_id exists
        if (targetUser.venue_id) {
          const { data: venue } = await supabase
            .from("venues")
            .select("name")
            .eq("id", targetUser.venue_id)
            .single();

          if (venue) {
            targetUser.venue_name = venue.name;
          }
        }

        return new Response(
          JSON.stringify({ success: true, user: targetUser }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List all users with filters
      const role = url.searchParams.get("role");
      const venueId = url.searchParams.get("venue_id");
      const isActive = url.searchParams.get("is_active");
      const search = url.searchParams.get("search");

      let query = supabase
        .from("users")
        .select("id, email, full_name, role, venue_id, is_active, last_login_at, created_at");

      if (role) query = query.eq("role", role);
      if (venueId) query = query.eq("venue_id", venueId);
      if (isActive !== null && isActive !== undefined) {
        query = query.eq("is_active", isActive === "true");
      }
      if (search) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      query = query.order("created_at", { ascending: false }).limit(100);

      const { data: users, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      // Get venue names for venue admins
      const venueIds = [...new Set(users.filter(u => u.venue_id).map(u => u.venue_id))];
      if (venueIds.length > 0) {
        const { data: venues } = await supabase
          .from("venues")
          .select("id, name")
          .in("id", venueIds);

        const venueMap = Object.fromEntries(venues?.map(v => [v.id, v.name]) || []);

        users.forEach(u => {
          if (u.venue_id && venueMap[u.venue_id]) {
            u.venue_name = venueMap[u.venue_id];
          }
        });
      }

      return new Response(
        JSON.stringify({ success: true, users, total: users.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Create new user
    if (req.method === "POST") {
      const userData: CreateUserRequest = await req.json();

      // Validate required fields
      if (!userData.email || !userData.full_name || !userData.role) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: email, full_name, role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", userData.email.toLowerCase())
        .single();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: "Email already in use" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Venue admins must have venue_id
      if (userData.role === "venue_admin" && !userData.venue_id) {
        return new Response(
          JSON.stringify({ error: "venue_id is required for venue_admin role" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate password if not provided
      let password = userData.password;
      if (!password) {
        const { generateRandomPassword } = await import("../_shared/password.ts");
        password = generateRandomPassword(16);
      } else {
        // Validate password strength
        const validation = validatePasswordStrength(password);
        if (!validation.isValid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          email: userData.email.toLowerCase(),
          full_name: userData.full_name,
          role: userData.role,
          venue_id: userData.venue_id || null,
          password_hash: passwordHash,
          is_active: true,
          created_by: user.id,
          email_verified_at: new Date().toISOString(), // Auto-verify for admin-created accounts
        })
        .select("id, email, full_name, role, venue_id, is_active, created_at")
        .single();

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "create_user",
        "user",
        newUser.id,
        { user: newUser, role: userData.role },
        req
      );

      // Return user data with temporary password
      return new Response(
        JSON.stringify({
          success: true,
          user: newUser,
          temporary_password: password,
          message: "User created successfully",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PATCH - Update user
    if (req.method === "PATCH") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updates: UpdateUserRequest = await req.json();

      // Get existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (fetchError || !existingUser) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent super admin from deactivating themselves
      if (userId === user.id && updates.is_active === false) {
        return new Response(
          JSON.stringify({ error: "Cannot deactivate your own account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update user
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId)
        .select("id, email, full_name, role, venue_id, is_active, last_login_at, created_at")
        .single();

      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "update_user",
        "user",
        userId,
        { before: existingUser, after: updates },
        req
      );

      return new Response(
        JSON.stringify({ success: true, user: updatedUser }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE - Soft delete user
    if (req.method === "DELETE") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent super admin from deleting themselves
      if (userId === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete your own account" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Soft delete (deactivate)
      const { data: deletedUser, error: deleteError } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("id", userId)
        .select("id, email, full_name")
        .single();

      if (deleteError) {
        throw new Error(`Failed to delete user: ${deleteError.message}`);
      }

      // Create audit log
      await createAuditLog(
        supabase,
        user.id,
        "delete_user",
        "user",
        userId,
        { user: deletedUser },
        req
      );

      return new Response(
        JSON.stringify({ success: true, message: "User deactivated successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Super admin users error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
