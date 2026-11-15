import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
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

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    // Use service role key directly without overriding Authorization with caller's anon token
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabaseClient
      .from("venues")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Database error fetching venues:", error);
      return jsonResponse({ error: "Failed to fetch venues" }, 500);
    }

    return jsonResponse({ data: data || [] }, 200);
  } catch (error) {
    console.error("Unexpected error fetching venues:", error);
    return jsonResponse({ error: "Failed to fetch venues" }, 500);
  }
});