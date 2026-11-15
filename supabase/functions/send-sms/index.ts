import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/\s+/g, "");
  let normalized = cleaned;
  if (cleaned.startsWith("0")) {
    normalized = "+44" + cleaned.slice(1);
  } else if (!cleaned.startsWith("+")) {
    normalized = "+44" + cleaned;
  }
  return /^\+[1-9][0-9]{7,14}$/.test(normalized) ? normalized : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const signingSecret = getSigningSecret();
    if (!signingSecret) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const adminToken = req.headers.get("x-admin-token");
    const isAuthorized = await verifyAdminToken(adminToken, signingSecret);
    if (!isAuthorized) {
      return jsonResponse({ error: "Admin authentication required" }, 401);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON request body" }, 400);
    }

    const rawPhone = typeof body?.phone === "string" ? body.phone : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const requestedFrom = typeof body?.from === "string" ? body.from.trim() : "";

    const phone = normalizePhone(rawPhone);
    if (!phone || !message) {
      return jsonResponse({ error: "Valid phone number and message are required" }, 400);
    }

    if (message.length > 1600) {
      return jsonResponse({ error: "Message exceeds maximum length (1600 characters)" }, 400);
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
    const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")?.trim();
    const fromNumber =
      Deno.env.get("TWILIO_FROM_NUMBER")?.trim() ||
      Deno.env.get("TWILIO_PHONE_NUMBER")?.trim() ||
      requestedFrom;

    if (!accountSid || !authToken || (!messagingServiceSid && !fromNumber)) {
      console.error("Twilio configuration is incomplete");
      return jsonResponse({ error: "SMS service is not configured" }, 500);
    }

    const params = new URLSearchParams({
      To: phone,
      Body: message,
    });
    if (messagingServiceSid) {
      params.set("MessagingServiceSid", messagingServiceSid);
    } else if (fromNumber) {
      params.set("From", fromNumber);
    }

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const twilioRaw = await twilioResponse.text();
    let twilioData: Record<string, unknown> = {};
    try {
      twilioData = twilioRaw ? JSON.parse(twilioRaw) : {};
    } catch {
      twilioData = {};
    }

    if (!twilioResponse.ok) {
      console.error("Twilio send-sms failure:", twilioResponse.status, twilioRaw);
      return jsonResponse({ error: "Failed to send SMS via provider" }, 502);
    }

    return jsonResponse({ success: true, sid: twilioData.sid ?? null }, 200);
  } catch (error) {
    console.error("Unexpected error in send-sms:", error);
    return jsonResponse({ error: "Failed to send SMS" }, 500);
  }
});
