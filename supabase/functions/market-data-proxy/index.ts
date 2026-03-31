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
    let lastError: unknown = null;

    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(DATA_URL, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/plain,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Referer": "http://88.99.64.228/",
            "Origin": "http://88.99.64.228",
          },
          signal: AbortSignal.timeout(15000),
        });

        const text = await res.text();

        if (res.ok) {
          return new Response(text, {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }

        lastError = `Upstream ${res.status}`;

        if (i === 2) {
          return new Response(text || String(lastError), {
            status: res.status,
            headers: {
              ...corsHeaders,
              "Content-Type": res.headers.get("content-type") ?? "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }
      } catch (error) {
        lastError = error;
      }

      if (i < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
      }
    }

    return new Response(JSON.stringify({ error: String(lastError ?? "Unknown upstream error") }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
