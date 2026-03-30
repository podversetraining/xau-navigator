import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const invalidSourcePatterns = [/<!doctype html/i, /<html/i, /authentication page/i, /sign in/i, /login/i, /auth/i];
const invalidAnalysisPatterns = [
  /insufficient data/i,
  /no (?:technical |market |indicator )?data (?:is )?(?:available|provided)/i,
  /cannot (?:perform|determine|analyze|assess)/i,
  /unable to (?:analyze|determine)/i,
  /html markup/i,
  /authentication page/i,
  /lacks all required technical indicators/i,
  /timestamp not available/i,
];

function hasValidMarketDataPayload(rawData: string): boolean {
  const trimmed = rawData.trim();

  if (!trimmed) return false;
  if (invalidSourcePatterns.some((pattern) => pattern.test(trimmed))) return false;

  return (
    trimmed.includes("--- Timeframe:") &&
    /EMA_8:/i.test(trimmed) &&
    /RSI:/i.test(trimmed) &&
    /MACD:/i.test(trimmed) &&
    /ATR:/i.test(trimmed)
  );
}

function containsInvalidAnalysisText(value: unknown): boolean {
  if (typeof value === "string") {
    return invalidAnalysisPatterns.some((pattern) => pattern.test(value.trim()));
  }

  if (Array.isArray(value)) {
    return value.some(containsInvalidAnalysisText);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(containsInvalidAnalysisText);
  }

  return false;
}

function isUsableAnalysis(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const analysis = value as {
    recommendation?: unknown;
    marketOverview?: { summary?: unknown; timeframes?: unknown[] };
  };

  return (
    ["BUY", "SELL", "WAIT"].includes(String(analysis.recommendation)) &&
    typeof analysis.marketOverview?.summary === "string" &&
    analysis.marketOverview.summary.trim().length > 0 &&
    Array.isArray(analysis.marketOverview?.timeframes) &&
    analysis.marketOverview.timeframes.length > 0 &&
    !containsInvalidAnalysisText(value)
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const prompt = body?.prompt;
    const rawData = body?.rawData;

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rawData || typeof rawData !== "string" || !hasValidMarketDataPayload(rawData)) {
      return new Response(JSON.stringify({ error: "Invalid market data payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_URL = Deno.env.get("AI_API_URL") || "https://api.lovable.dev/v1/chat/completions";
    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY") || "";
    if (!AI_API_KEY) throw new Error("AI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const dedupeThreshold = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    const { data: recentRows } = await supabase
      .from("gold_analysis")
      .select("analysis, created_at")
      .gte("created_at", dedupeThreshold)
      .order("created_at", { ascending: false })
      .limit(5);

    const cachedAnalysis = recentRows?.find((row) => isUsableAnalysis(row.analysis));
    if (cachedAnalysis) {
      return new Response(JSON.stringify(cachedAnalysis.analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are a professional quantitative gold trading analyst. Always respond with valid JSON only, no markdown formatting, no code blocks. Just raw JSON. Never mention missing data, unavailable indicators, HTML, authentication, or source errors." },
          { role: "user", content: prompt },
        ],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("AI API rate limited, returning soft error");
        return new Response(JSON.stringify({ ok: false, rate_limited: true, error: "Rate limited, will retry on next cycle." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ ok: false, error: "Payment required." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text().catch(() => "");
      console.error("AI API error:", response.status, t);
      return new Response(JSON.stringify({ ok: false, unavailable: true, error: "سنعود قريباً" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let parsed;
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: content, error: "Failed to parse AI response as JSON" };
    }

    if (!isUsableAnalysis(parsed)) {
      return new Response(JSON.stringify({ ok: false, error: "AI returned an invalid analysis payload" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to database (insert new, keeping history)
    const { error: dbError } = await supabase
      .from("gold_analysis")
      .insert({ analysis: parsed });

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-gold error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
