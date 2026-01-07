// CORS utility for Edge Functions

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://movemate.vercel.app",
  // Add your production domain here
];

export function getCorsHeaders(origin: string | null): HeadersInit {
  const corsHeaders: HeadersInit = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  } else if (origin && origin.includes("localhost")) {
    // Allow all localhost origins in development
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  } else {
    // Default to first allowed origin if not found
    corsHeaders["Access-Control-Allow-Origin"] = allowedOrigins[0];
  }

  return corsHeaders;
}

export function handleCorsPreFlight(req: Request): Response {
  const origin = req.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
