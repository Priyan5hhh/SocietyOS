import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Mints short-lived ImageKit upload auth params (token, expire, signature) using the
// ImageKit PRIVATE key, which lives only in this function's environment (Supabase secret),
// never in frontend code. See src/lib/services/storage.ts for the client-side consumer.
//
// Algorithm per ImageKit docs: signature = HMAC-SHA1(privateKey, token + expire), hex-encoded.
const PRIVATE_KEY = Deno.env.get("IMAGEKIT_PRIVATE_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function hmacSha1Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (!PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "IMAGEKIT_PRIVATE_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const token = crypto.randomUUID()
  const expire = Math.floor(Date.now() / 1000) + 2400 // 40 min, within ImageKit's 1hr max
  const signature = await hmacSha1Hex(PRIVATE_KEY, token + expire)

  return new Response(JSON.stringify({ token, expire, signature }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
