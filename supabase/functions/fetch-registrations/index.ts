import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function getSigningSecret(): string | null {
  const explicit = Deno.env.get("ADMIN_SESSION_SECRET")?.trim();
  if (explicit) return explicit;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!serviceRoleKey) return null;
  return `movemate-admin-session:${serviceRoleKey}`;
}

async function verifyAdminToken(token: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.trim().split(".");
  if (parts.length !== 2) return false;
  const [encodedPayload, encodedSig] = parts;
  const providedSig = fromBase64Url(encodedSig);
  const payloadBytes = fromBase64Url(encodedPayload);
  if (!providedSig || !payloadBytes) return false;

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expectedSig = new Uint8Array(
    await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(encodedPayload))
  );

  if (!timingSafeEqual(providedSig, expectedSig)) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    return (
      payload?.role === "super_admin" &&
      typeof payload?.exp === "number" &&
      payload.exp > Date.now()
    );
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const signingSecret = getSigningSecret();

    if (!supabaseUrl || !serviceRoleKey || !signingSecret) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const adminToken = req.headers.get("x-admin-token");
    const isAuthorized = await verifyAdminToken(adminToken, signingSecret);
    if (!isAuthorized) {
      return jsonResponse({ error: "Admin authentication required" }, 401);
    }

    const url = new URL(req.url);
    const venueId = url.searchParams.get("venue_id");

    // Use service role key directly without overriding Authorization with caller's anon token
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    let query = supabaseClient
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (venueId !== null && venueId !== "") {
      query = query.eq("venue_id", venueId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error fetching registrations:", error);
      return jsonResponse({ error: "Failed to fetch registrations" }, 500);
    }

    const registrationsData = (data || [])
      .map((reg) => ({
        id: reg.id,
        reg: reg.reg || "",
        phone: reg.phone || "",
        venue_id: reg.venue_id ?? "",
        vehicle_data: reg.vehicle_data ?? null,
        created_at: reg.created_at ?? null,
        consent_timestamp: reg.consent_timestamp ?? null,
      }))
      .filter((reg) => reg.reg && reg.phone);

    return jsonResponse({ data: registrationsData }, 200);
  } catch (error) {
    console.error("Unexpected error fetching registrations:", error);
    return jsonResponse({ error: "Failed to fetch registrations" }, 500);
  }
});