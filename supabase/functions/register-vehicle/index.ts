import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UK_REG_PATTERN =
  /^[A-Z]{2}[0-9]{2}[A-Z]{3}$|^[A-Z][0-9]{1,3}[A-Z]{3}$|^[A-Z]{3}[0-9]{1,3}[A-Z]$|^[0-9]{1,4}[A-Z]{1,2}$|^[0-9]{1,3}[A-Z]{1,3}$|^[A-Z]{1,2}[0-9]{1,4}$|^[A-Z]{1,3}[0-9]{1,3}$|^[A-Z]{1,3}[0-9]{1,4}$/i;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function normalizeUkMobile(phone: string): string | null {
  const cleaned = phone.replace(/\s+/g, "");
  let normalized = cleaned;
  if (cleaned.startsWith("0")) {
    normalized = "+44" + cleaned.slice(1);
  } else if (!cleaned.startsWith("+")) {
    normalized = "+44" + cleaned;
  }
  return /^\+447[0-9]{9}$/.test(normalized) ? normalized : null;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const hour = parts.hour === "24" ? "00" : parts.hour;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

function localMidnightUtcIso(year: number, month: number, day: number, timeZone: string): string {
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const firstPass = utcGuess - getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  const refined = utcGuess - getTimeZoneOffsetMs(new Date(firstPass), timeZone);
  return new Date(refined).toISOString();
}

function getUkDayBoundsUtc(now = new Date()): { startIso: string; endIso: string } {
  const ukDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = ukDate.split("-").map(Number);
  return {
    startIso: localMidnightUtcIso(year, month, day, "Europe/London"),
    endIso: localMidnightUtcIso(year, month, day + 1, "Europe/London"),
  };
}

async function sendConfirmationSms(phone: string, message: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")?.trim();
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER")?.trim() || Deno.env.get("TWILIO_PHONE_NUMBER")?.trim();

  if (!accountSid || !authToken || (!messagingServiceSid && !fromNumber)) {
    return false;
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

  const response = await fetch(
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

  if (!response.ok) {
    const errText = await response.text();
    console.error("Twilio confirmation SMS error:", response.status, errText);
    return false;
  }

  return true;
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

    const rawReg = typeof body?.reg === "string" ? body.reg : "";
    const rawPhone = typeof body?.phone === "string" ? body.phone : "";
    const venueId = body?.venue_id;
    const vehicleData = body?.vehicle_data;

    const normalizedReg = rawReg.replace(/\s+/g, "").toUpperCase();
    const normalizedPhone = normalizeUkMobile(rawPhone);
    const hasVenueId = venueId !== undefined && venueId !== null && String(venueId).trim() !== "";

    if (!normalizedReg || !normalizedPhone || !hasVenueId) {
      return jsonResponse({ error: "Registration, phone, and venue are required" }, 400);
    }

    if (!UK_REG_PATTERN.test(normalizedReg)) {
      return jsonResponse({ error: "Please enter a valid UK registration number" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    // Use service role key directly without overriding Authorization with caller's anon token
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const { startIso, endIso } = getUkDayBoundsUtc();

    const { data: existing, error: existingError } = await supabaseClient
      .from("registrations")
      .select("id")
      .eq("reg", normalizedReg)
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    if (existingError) {
      console.error("Error checking existing registration:", existingError);
      return jsonResponse({ error: "Failed to validate registration" }, 500);
    }

    if (existing && existing.length > 0) {
      return jsonResponse({ error: "This vehicle is already registered today" }, 409);
    }

    const registrationData: Record<string, unknown> = {
      reg: normalizedReg,
      phone: normalizedPhone,
      venue_id: venueId,
      consent_timestamp: new Date().toISOString(),
    };

    if (vehicleData && typeof vehicleData === "object") {
      registrationData.vehicle_data = vehicleData;
    }

    const { data, error } = await supabaseClient
      .from("registrations")
      .insert([registrationData])
      .select();

    if (error) {
      if (error.code === "23505") {
        return jsonResponse({ error: "This vehicle is already registered today" }, 409);
      }
      console.error("Database error inserting registration:", error);
      return jsonResponse({ error: "Failed to register vehicle" }, 500);
    }

    // Look up venue name for personalized confirmation SMS (sent server-side)
    let venueName = "";
    try {
      const { data: venue } = await supabaseClient
        .from("venues")
        .select("name")
        .eq("id", venueId)
        .maybeSingle();
      if (venue?.name) {
        venueName = venue.name;
      }
    } catch {
      // Non-fatal: omit venue name if lookup fails
    }

    const venueText = venueName ? ` at ${venueName}` : "";
    let smsSent = false;
    try {
      smsSent = await sendConfirmationSms(
        normalizedPhone,
        `MoveMate: Your vehicle ${normalizedReg}${venueText} is validated with MoveMate. You'll receive immediate notifications if your vehicle blocks access. Privacy: tiny.cc/movemate`
      );
    } catch (smsErr) {
      console.warn("Confirmation SMS failed (non-fatal):", smsErr);
    }

    return jsonResponse({ success: true, data, smsSent }, 200);
  } catch (error) {
    console.error("Unexpected error registering vehicle:", error);
    return jsonResponse({ error: "Failed to register vehicle" }, 500);
  }
});