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
  if (invalidSourcePatterns.some((p) => p.test(trimmed))) return false;
  return (
    trimmed.includes("--- Timeframe:") &&
    /EMA_8:/i.test(trimmed) &&
    /RSI:/i.test(trimmed) &&
    /MACD:/i.test(trimmed) &&
    /ATR:/i.test(trimmed)
  );
}

function containsInvalidAnalysisText(value: unknown): boolean {
  if (typeof value === "string") return invalidAnalysisPatterns.some((p) => p.test(value.trim()));
  if (Array.isArray(value)) return value.some(containsInvalidAnalysisText);
  if (value && typeof value === "object") return Object.values(value).some(containsInvalidAnalysisText);
  return false;
}

function isUsableAnalysis(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;

  const hasRecommendation = ["BUY", "SELL", "WAIT"].includes(String(a.recommendation));
  const overview = a.marketOverview as { summary?: string; timeframes?: unknown[] } | undefined;
  const hasSummary = typeof overview?.summary === "string" && overview.summary.trim().length > 0;
  const hasTimeframes = Array.isArray(overview?.timeframes) && overview!.timeframes!.length > 0;

  return hasRecommendation && hasSummary && hasTimeframes && !containsInvalidAnalysisText(value);
}

/** Detect contradictions between signal and supporting analysis */
function hasContradiction(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const a = value as Record<string, unknown>;

  const rec = String(a.recommendation);
  if (rec === "WAIT") return false; // WAIT is always consistent

  const confidence = Number(a.confidenceScore ?? a.confidence ?? 0);
  if (confidence < 65) return true; // Low confidence = unreliable

  // Check trend alignment
  const trend = a.trendAnalysis as Record<string, unknown> | undefined;
  const dominantTrend = String(trend?.dominantTrend ?? trend?.direction ?? "").toUpperCase();

  if (rec === "BUY" && dominantTrend.includes("BEARISH")) return true;
  if (rec === "SELL" && dominantTrend.includes("BULLISH")) return true;

  // Check momentum alignment
  const momentum = a.momentumAnalysis as Record<string, unknown> | undefined;
  const momDirection = String(momentum?.direction ?? momentum?.overallMomentum ?? "").toUpperCase();

  if (rec === "BUY" && momDirection.includes("BEARISH")) return true;
  if (rec === "SELL" && momDirection.includes("BULLISH")) return true;

  return false;
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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache (4 min dedup)
    const dedupeThreshold = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    const { data: recentRows } = await supabase
      .from("gold_analysis")
      .select("analysis, created_at")
      .gte("created_at", dedupeThreshold)
      .order("created_at", { ascending: false })
      .limit(5);

    const cachedAnalysis = recentRows?.find((row) => isUsableAnalysis(row.analysis) && !hasContradiction(row.analysis));
    if (cachedAnalysis) {
      return new Response(JSON.stringify(cachedAnalysis.analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Anthropic Claude Sonnet directly
    const MAX_ATTEMPTS = 2;
    let parsed: unknown = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8192,
          system: `You are a professional quantitative gold trading analyst. 
CRITICAL RULES:
1. Always respond with valid JSON only — no markdown, no code blocks, just raw JSON.
2. Never mention missing data, unavailable indicators, HTML, authentication, or source errors.
3. Your recommendation MUST be consistent with your analysis:
   - If trend is BULLISH and momentum is BULLISH → recommendation should be BUY
   - If trend is BEARISH and momentum is BEARISH → recommendation should be SELL
   - If trend and momentum conflict → recommendation should be WAIT
4. confidenceScore must reflect actual indicator agreement (0-100). Only use 80+ if 80%+ of indicators agree.
5. Do NOT give BUY/SELL with confidence below 65.
6. Every number (entry, SL, TP) must come from the actual data provided.`,
          messages: [
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("AI API rate limited");
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
        return new Response(JSON.stringify({ ok: false, unavailable: true, error: "We'll be back shortly" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      try {
        let cleaned = content.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        parsed = JSON.parse(cleaned);
      } catch {
        console.warn(`Attempt ${attempt + 1}: Failed to parse AI JSON`);
        parsed = null;
        continue;
      }

      if (!isUsableAnalysis(parsed)) {
        console.warn(`Attempt ${attempt + 1}: Analysis failed usability check`);
        parsed = null;
        continue;
      }

      if (hasContradiction(parsed)) {
        console.warn(`Attempt ${attempt + 1}: Contradictory signals detected, retrying...`);
        parsed = null;
        continue;
      }

      // Passed all checks
      break;
    }

    if (!parsed) {
      return new Response(JSON.stringify({ ok: false, error: "AI analysis did not meet quality threshold" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to database
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
