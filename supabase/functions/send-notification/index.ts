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

    const rawReg = typeof body?.blockedReg === "string" ? body.blockedReg : "";
    const normalizedReg = rawReg.replace(/\s+/g, "").toUpperCase();

    if (!normalizedReg || !UK_REG_PATTERN.test(normalizedReg)) {
      return jsonResponse({ error: "Please enter a valid UK registration number." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    const { startIso, endIso } = getUkDayBoundsUtc();

    const { data: registration, error: lookupError } = await supabaseClient
      .from("registrations")
      .select("id, reg, phone, venue_id, created_at")
      .eq("reg", normalizedReg)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error("Database lookup error in send-notification:", lookupError);
      return jsonResponse({ error: "Failed to look up registration" }, 500);
    }

    if (!registration || !registration.phone) {
      return jsonResponse(
        { error: "No active registration was found for that vehicle today." },
        404
      );
    }

    let venueName = "";
    if (registration.venue_id !== undefined && registration.venue_id !== null && registration.venue_id !== "") {
      try {
        const { data: venue } = await supabaseClient
          .from("venues")
          .select("name")
          .eq("id", registration.venue_id)
          .maybeSingle();
        if (venue?.name) {
          venueName = venue.name;
        }
      } catch {
        // Non-fatal
      }
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
    const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")?.trim();
    const fromNumber =
      Deno.env.get("TWILIO_FROM_NUMBER")?.trim() ||
      Deno.env.get("TWILIO_PHONE_NUMBER")?.trim() ||
      "MOVEMATE";

    if (!accountSid || !authToken || (!messagingServiceSid && !fromNumber)) {
      console.error("Twilio configuration is incomplete");
      return jsonResponse({ error: "SMS notification service is not configured" }, 500);
    }

    const venueText = venueName ? ` at ${venueName}` : "";
    const message = `MoveMate URGENT: Vehicle ${normalizedReg}${venueText} is blocking another car in. Please move your vehicle as soon as possible. Thank you!`;

    const params = new URLSearchParams({
      To: registration.phone,
      Body: message,
    });
    if (messagingServiceSid) {
      params.set("MessagingServiceSid", messagingServiceSid);
    } else {
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

    if (!twilioResponse.ok) {
      const errText = await twilioResponse.text();
      console.error("Twilio send-notification error:", twilioResponse.status, errText);
      return jsonResponse({ error: "Failed to send SMS notification" }, 502);
    }

    return jsonResponse({ success: true, message: "Notification sent" }, 200);
  } catch (error) {
    console.error("Unexpected error in send-notification:", error);
    return jsonResponse({ error: "Failed to send notification" }, 500);
  }
});
