import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DATA_URL = "http://88.99.64.228/XAUUSDm_Complete_Data.txt";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let lastErr: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(`${DATA_URL}?t=${Date.now()}`, {
          signal: AbortSignal.timeout(15000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/plain,*/*",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Connection": "close",
          },
        });
        if (!res.ok) throw new Error(`Upstream ${res.status}`);
        const text = await res.text();
        return new Response(text, {
          headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
    }
    return new Response(JSON.stringify({ error: String(lastErr) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
