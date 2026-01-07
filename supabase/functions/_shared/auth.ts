// Authentication utility functions
// Handles session token creation, verification, and user context

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "user" | "venue_admin" | "super_admin";
  venue_id: string | null;
  is_active: boolean;
}

export interface Session {
  id: string;
  token: string;
  user: User;
  expires_at: string;
}

/**
 * Generate a secure session token
 * @returns Random UUID token
 */
export function generateSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Create a new session for a user
 * @param supabase Supabase client
 * @param userId User ID
 * @param req Request object for user agent and IP
 * @param expiresInHours Session duration in hours (default 24)
 * @returns Session object with token
 */
export async function createSession(
  supabase: SupabaseClient,
  userId: string,
  req: Request,
  expiresInHours: number = 24
): Promise<Session> {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const userAgent = req.headers.get("user-agent");
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

  // Create session in database
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
    })
    .select("id, token, expires_at")
    .single();

  if (sessionError) {
    throw new Error(`Failed to create session: ${sessionError.message}`);
  }

  // Fetch user data
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, email, full_name, role, venue_id, is_active")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    throw new Error(`Failed to fetch user: ${userError?.message}`);
  }

  return {
    id: sessionData.id,
    token: sessionData.token,
    user: userData as User,
    expires_at: sessionData.expires_at,
  };
}

/**
 * Verify a session token and return user
 * @param supabase Supabase client
 * @param token Session token
 * @returns User object if valid, null if invalid
 */
export async function verifySession(
  supabase: SupabaseClient,
  token: string
): Promise<User | null> {
  // Find session
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .single();

  if (sessionError || !sessionData) {
    return null;
  }

  // Check if session is expired
  const expiresAt = new Date(sessionData.expires_at);
  if (expiresAt < new Date()) {
    // Session expired, delete it
    await supabase.from("sessions").delete().eq("token", token);
    return null;
  }

  // Fetch user
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, email, full_name, role, venue_id, is_active")
    .eq("id", sessionData.user_id)
    .single();

  if (userError || !userData) {
    return null;
  }

  // Check if user is active
  if (!userData.is_active) {
    return null;
  }

  // Update last activity
  await supabase
    .from("sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("token", token);

  return userData as User;
}

/**
 * Extract and verify session token from request
 * @param req Request object
 * @param supabase Supabase client
 * @returns User object if valid, null if invalid
 */
export async function getUserFromRequest(
  req: Request,
  supabase: SupabaseClient
): Promise<User | null> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  return await verifySession(supabase, token);
}

/**
 * Delete a session (logout)
 * @param supabase Supabase client
 * @param token Session token
 */
export async function deleteSession(
  supabase: SupabaseClient,
  token: string
): Promise<void> {
  await supabase.from("sessions").delete().eq("token", token);
}

/**
 * Delete all sessions for a user (logout all devices)
 * @param supabase Supabase client
 * @param userId User ID
 */
export async function deleteAllUserSessions(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase.from("sessions").delete().eq("user_id", userId);
}

/**
 * Check if user has required role
 * @param user User object
 * @param requiredRole Required role or array of allowed roles
 * @returns True if user has required role
 */
export function hasRole(
  user: User,
  requiredRole: User["role"] | User["role"][]
): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  return user.role === requiredRole;
}

/**
 * Check if user can access a venue
 * @param user User object
 * @param venueId Venue ID to check
 * @returns True if user can access this venue
 */
export function canAccessVenue(user: User, venueId: string): boolean {
  // Super admins can access all venues
  if (user.role === "super_admin") {
    return true;
  }

  // Venue admins can only access their own venue
  if (user.role === "venue_admin") {
    return user.venue_id === venueId;
  }

  // Regular users cannot access venue admin features
  return false;
}

/**
 * Create an audit log entry
 * @param supabase Supabase client
 * @param userId User who performed the action
 * @param action Action description
 * @param entityType Type of entity affected
 * @param entityId ID of entity affected
 * @param changes JSON object with changes
 * @param req Request object for IP/user agent
 */
export async function createAuditLog(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, any> | null,
  req: Request
): Promise<void> {
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent");

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    changes,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}
