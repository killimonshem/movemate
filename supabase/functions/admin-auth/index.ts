import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const PBKDF2_PREFIX = "pbkdf2";
const PBKDF2_ITERATIONS = 100_000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    return null;
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

async function hashPasswordPbkdf2(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}

async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedHash || typeof storedHash !== "string") {
    return { valid: false, needsRehash: false };
  }

  if (storedHash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const parts = storedHash.split("$");
    if (parts.length !== 4) return { valid: false, needsRehash: false };
    const iterations = Number(parts[1]);
    const salt = hexToBytes(parts[2]);
    const expected = hexToBytes(parts[3]);
    if (!Number.isInteger(iterations) || iterations < 10_000 || !salt || !expected) {
      return { valid: false, needsRehash: false };
    }
    const derived = await derivePbkdf2(password, salt, iterations);
    return {
      valid: timingSafeEqual(derived, expected),
      needsRehash: iterations < PBKDF2_ITERATIONS,
    };
  }

  // Legacy unsalted SHA-256 compatibility check (upgrades to PBKDF2 on successful login)
  if (/^[0-9a-f]{64}$/i.test(storedHash)) {
    const candidateHex = await sha256Hex(password);
    const candidateBytes = hexToBytes(candidateHex);
    const expectedBytes = hexToBytes(storedHash.toLowerCase());
    if (!candidateBytes || !expectedBytes) return { valid: false, needsRehash: false };
    return {
      valid: timingSafeEqual(candidateBytes, expectedBytes),
      needsRehash: true,
    };
  }

  return { valid: false, needsRehash: false };
}

function getSigningSecret(): string | null {
  const explicit = Deno.env.get("ADMIN_SESSION_SECRET")?.trim();
  if (explicit) return explicit;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!serviceRoleKey) return null;
  return `movemate-admin-session:${serviceRoleKey}`;
}

async function signAdminToken(admin: { id: string | number; username: string }, secret: string) {
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const payload = {
    sub: admin.id,
    username: admin.username,
    role: "super_admin",
    iat: now,
    exp: expiresAt,
  };
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    new TextEncoder().encode(encodedPayload)
  );
  return {
    token: `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`,
    expiresAt,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON request body" }, 400);
    }

    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password.trim() : "";

    if (!username || !password) {
      return jsonResponse({ error: "Username and password are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const signingSecret = getSigningSecret();

    if (!supabaseUrl || !serviceRoleKey || !signingSecret) {
      console.error("Missing required Supabase environment configuration");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    // Use service role key directly without forwarding caller's anon Authorization header
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabaseClient
      .from("super_admins")
      .select("id, username, email, password_hash, created_at")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return jsonResponse({ error: "Database error occurred" }, 500);
    }

    if (!data) {
      // Perform equivalent work to reduce user-enumeration timing differences
      await sha256Hex(password);
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }

    const verification = await verifyPassword(password, data.password_hash);
    if (!verification.valid) {
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }

    // Best-effort upgrade of legacy unsalted SHA-256 hashes to salted PBKDF2
    if (verification.needsRehash) {
      try {
        const upgradedHash = await hashPasswordPbkdf2(password);
        await supabaseClient
          .from("super_admins")
          .update({ password_hash: upgradedHash })
          .eq("id", data.id);
      } catch (upgradeErr) {
        console.warn("Non-fatal password hash upgrade skipped:", upgradeErr);
      }
    }

    const { token, expiresAt } = await signAdminToken(
      { id: data.id, username: data.username },
      signingSecret
    );

    const safeAdmin = {
      id: data.id,
      username: data.username,
      email: data.email,
      created_at: data.created_at,
    };

    return jsonResponse({ success: true, admin: safeAdmin, token, expiresAt }, 200);
  } catch (error) {
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "An unexpected error occurred" }, 500);
  }
});