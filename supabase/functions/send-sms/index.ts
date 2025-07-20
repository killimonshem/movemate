import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, message, from } = await req.json()

    // Validate required fields
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone number and message are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For demo purposes, we'll simulate SMS sending
    // In production, you would integrate with a real SMS service like Twilio, MessageBird, etc.
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Log the SMS for demo purposes
    console.log(`SMS sent to ${phone}: ${message}`)
    
    // In a real implementation, you would:
    // 1. Call your SMS provider's API
    // 2. Handle rate limiting
    // 3. Log the SMS in your database
    // 4. Handle delivery status updates
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS sent successfully',
        to: phone,
        from: from || 'MOVEMATE'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending SMS:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send SMS' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 