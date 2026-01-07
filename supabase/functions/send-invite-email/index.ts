// Send Invite Email Edge Function
// Sends welcome email to new venue admins via Resend
// Only accessible by super admins

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";
import { getUserFromRequest, hasRole } from "../_shared/auth.ts";

interface SendInviteRequest {
  user_id: string;
  temporary_password: string;
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

    // Get authenticated user
    const user = await getUserFromRequest(req, supabase);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only super admins can send invites
    if (!hasRole(user, "super_admin")) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions - Super admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request data
    const { user_id, temporary_password }: SendInviteRequest = await req.json();

    if (!user_id || !temporary_password) {
      return new Response(
        JSON.stringify({ error: "user_id and temporary_password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get new user details
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name, role, venue_id")
      .eq("id", user_id)
      .single();

    if (userError || !newUser) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get venue details if venue_admin
    let venueName = "MoveMate";
    if (newUser.venue_id) {
      const { data: venue } = await supabase
        .from("venues")
        .select("name")
        .eq("id", newUser.venue_id)
        .single();

      if (venue) {
        venueName = venue.name;
      }
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Prepare email content
    const loginUrl = Deno.env.get("APP_URL") || "https://movemate.vercel.app";
    const roleLabel = newUser.role === "venue_admin" ? "Venue Administrator" : "User";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials-box { background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credential-row { display: flex; margin: 10px 0; }
    .credential-label { font-weight: bold; min-width: 120px; color: #6b7280; }
    .credential-value { font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">Welcome to MoveMate</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Parking Management System</p>
    </div>
    <div class="content">
      <p>Hello ${newUser.full_name || "there"},</p>

      <p>You've been set up as a <strong>${roleLabel}</strong> ${newUser.venue_id ? `for <strong>${venueName}</strong>` : ""} on MoveMate, the parking management system.</p>

      <div class="credentials-box">
        <h3 style="margin-top: 0;">Your Login Credentials</h3>
        <div class="credential-row">
          <span class="credential-label">Email:</span>
          <span class="credential-value">${newUser.email}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Temporary Password:</span>
          <span class="credential-value">${temporary_password}</span>
        </div>
      </div>

      <div class="warning">
        <strong>⚠️ Important:</strong> Please change your password immediately after your first login for security.
      </div>

      <div style="text-align: center;">
        <a href="${loginUrl}/login" class="button">Login to MoveMate</a>
      </div>

      <h3>What's Next?</h3>
      <ol>
        <li>Click the button above to access MoveMate</li>
        <li>Log in with your email and temporary password</li>
        <li>You'll be prompted to change your password</li>
        <li>${newUser.role === "venue_admin" ? "Explore your venue dashboard and configure settings" : "Start using MoveMate features"}</li>
      </ol>

      <h3>Need Help?</h3>
      <p>If you have any questions or need assistance, please reply to this email.</p>

      <p>Best regards,<br><strong>The MoveMate Team</strong></p>

      <div class="footer">
        <p>This is an automated email from MoveMate. Please do not reply directly to this message.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const emailText = `
Welcome to MoveMate

Hello ${newUser.full_name || "there"},

You've been set up as a ${roleLabel} ${newUser.venue_id ? `for ${venueName}` : ""} on MoveMate.

Your Login Credentials:
- Email: ${newUser.email}
- Temporary Password: ${temporary_password}

IMPORTANT: Please change your password immediately after your first login.

Login: ${loginUrl}/login

What's Next?
1. Click the link above to access MoveMate
2. Log in with your email and temporary password
3. You'll be prompted to change your password
4. ${newUser.role === "venue_admin" ? "Explore your venue dashboard and configure settings" : "Start using MoveMate features"}

Need help? Reply to this email.

Best regards,
The MoveMate Team
    `.trim();

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "MoveMate <onboarding@resend.dev>", // Change to your verified domain
        to: [newUser.email],
        subject: `Welcome to MoveMate - Your ${roleLabel} Account`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      throw new Error(`Failed to send email: ${resendData.message || "Unknown error"}`);
    }

    console.log("Invite email sent:", {
      email_id: resendData.id,
      recipient: newUser.email,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invite email sent successfully",
        email_id: resendData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send invite email error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
