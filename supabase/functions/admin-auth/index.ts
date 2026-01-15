import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory rate limiting (in production, use Redis or similar)
const loginAttempts = new Map<string, { count: number; resetTime: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(identifier: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now()
  const attempt = loginAttempts.get(identifier)

  if (!attempt) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + LOCKOUT_DURATION })
    return { allowed: true }
  }

  // Reset if lockout period has passed
  if (now > attempt.resetTime) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + LOCKOUT_DURATION })
    return { allowed: true }
  }

  // Check if max attempts exceeded
  if (attempt.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((attempt.resetTime - now) / 1000 / 60)
    return { allowed: false, remainingTime }
  }

  // Increment attempt count
  attempt.count++
  return { allowed: true }
}

function clearRateLimit(identifier: string) {
  loginAttempts.delete(identifier)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Rate limiting check
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const identifier = `${username.trim()}:${clientIp}`
    const rateCheck = checkRateLimit(identifier)

    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateCheck.remainingTime
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        },
      )
    }

    // Create a Supabase client with the service role key (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Query the super_admins table
    const { data, error } = await supabaseClient
      .from('super_admins')
      .select('id, username, email, password_hash, created_at')
      .eq('username', username.trim())
      .maybeSingle()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      )
    }

    // Verify password using bcrypt
    if (data && await bcrypt.compare(password.trim(), data.password_hash)) {
      // Clear rate limit on successful login
      clearRateLimit(identifier)

      // Generate a simple session token (in production, use proper JWT with expiry)
      const sessionToken = crypto.randomUUID()

      // Store session in database (you should create a sessions table)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      await supabaseClient
        .from('admin_sessions')
        .insert([{
          admin_id: data.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
        }])

      return new Response(
        JSON.stringify({
          success: true,
          admin: { id: data.id, username: data.username, email: data.email },
          sessionToken,
          expiresAt: expiresAt.toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      // Generic error message - don't reveal if user exists
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Authentication failed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      },
    )
  }
})