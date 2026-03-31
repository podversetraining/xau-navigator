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
  return trimmed.includes("--- Timeframe:") && /EMA_8:/i.test(trimmed) && /RSI:/i.test(trimmed) && /MACD:/i.test(trimmed) && /ATR:/i.test(trimmed);
}

function containsInvalidAnalysisText(value: unknown): boolean {
  if (typeof value === "string") return invalidAnalysisPatterns.some((p) => p.test(value.trim()));
  if (Array.isArray(value)) return value.some(containsInvalidAnalysisText);
  if (value && typeof value === "object") return Object.values(value).some(containsInvalidAnalysisText);
  return false;
}

function isUsableAnalysis(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const a = value as { recommendation?: unknown; marketOverview?: { summary?: unknown; timeframes?: unknown[] } };
  return (
    ["BUY", "SELL", "WAIT"].includes(String(a.recommendation)) &&
    typeof a.marketOverview?.summary === "string" &&
    a.marketOverview.summary.trim().length > 0 &&
    Array.isArray(a.marketOverview?.timeframes) &&
    a.marketOverview.timeframes.length > 0 &&
    !containsInvalidAnalysisText(value)
  );
}

const FULL_PROMPT = `You are a professional quantitative analyst specializing in Gold trading (XAUUSD) using a multi-layer analysis system.

The data below contains COMPLETE technical indicator data for 7 timeframes (D1, H4, H1, M30, M15, M5, M1) with 90+ indicators each. READ ALL THE DATA CAREFULLY.

CORE PRINCIPLE:
- Do NOT require all indicators to agree (that kills trades)
- Required: alignment of 3 main layers (Trend + Momentum + Confirmation)
- Conflicting indicators are natural — majority direction matters
- If 70% of indicators align in one direction = sufficient signal

LAYER 1: Dominant Trend (Weight: 40%) — From D1 & H4
Analyze: EMA order (8/21/50/100/200), SMA order (20/50/200), WMA_21, Trend_Classification, Trend_Strength_Index, SuperTrend, Alligator_State, Aroon_Oscillator, Vortex_Diff, TRIX, ADXR, Ichimoku (Cloud_Position, Tenkan vs Kijun, Chikou, cloud thickness), Fibonacci (Trend_Direction, Price_Position_in_Range, retracement & extension levels).

LAYER 2: Momentum & Timing (Weight: 35%) — From H1, M30, M15
Analyze: RSI (14/21/9), MACD vs Signal, MACD_Fast vs Fast_Signal, MACD_Histogram direction, Stoch K/D, Williams_R, CCI_20, Momentum_14, ROC_12, DeMarker. CRITICAL: Check for divergences between price and RSI/MACD on H1 & M30.

LAYER 3: Entry Zone & Confirmation (Weight: 25%) — From M15, M5, M1
Analyze: BB (upper/mid/lower, width), Keltner channels, Channel_Position, Envelopes, Pivot Points (R1-R3, S1-S3), SuperTrend as dynamic S/R, PSAR, Fractals, ATR/ATR_21 for SL (1.5-2x ATR), Volatility_Ratio, MFI_14, Volume vs Avg, Relative_Volume, Volume_ROC.

SCORING: Layer1: _/40 | Layer2: _/35 | Layer3: _/25 | Total: _/100
<50: WAIT | 50-64: Weak | 65-79: Good | 80-89: Strong | 90-100: Excellent

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):
{
  "recommendation": "BUY" or "SELL" or "WAIT",
  "tradeType": "Scalping" or "Intraday" or "Swing",
  "score": {"layer1": number, "layer2": number, "layer3": number, "total": number, "rating": "Weak/Good/Strong/Excellent"},
  "entry": number,
  "stopLoss": number,
  "tp1": number,
  "tp2": number,
  "tp3": number,
  "riskReward": number,
  "lotSize": number,
  "lotCalculation": "$20 / (SL pips x pip value) = X lot",
  "marketOverview": {
    "overallBias": "Bullish/Bearish/Neutral",
    "summary": "4-5 sentence professional market narrative covering all timeframes, structure, momentum, volatility, and execution bias — written as a senior analyst briefing",
    "timeframes": [
      {"timeframe": "D1", "trend": "Bullish/Bearish/Sideways", "momentum": "Bullish/Bearish/Neutral", "strength": 0-100, "keySignal": "1-2 sentence key observation"},
      {"timeframe": "H4", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "H1", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "M30", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "M15", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "M5", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "M1", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."}
    ]
  },
  "layer1Analysis": {
    "trend": "Bullish/Bearish/Sideways",
    "strength": number,
    "emaOrder": "EMA alignment with actual values from D1 & H4",
    "superTrend": "SuperTrend direction and value with context",
    "alligator": "Alligator state with jaw/teeth/lips values",
    "ichimoku": "Cloud position, Tenkan/Kijun cross, cloud thickness",
    "fibonacci": "Price position in fib range with key levels",
    "summary": "3-4 sentence professional trend narrative with actual values"
  },
  "layer2Analysis": {
    "momentum": "Bullish/Bearish/Neutral",
    "strength": number,
    "rsi": "RSI readings across H1/M30/M15 with actual values",
    "macd": "MACD cross status with actual values",
    "stochastic": "Stochastic K/D values and zone",
    "divergence": "Divergence analysis between price and RSI/MACD",
    "summary": "3-4 sentence professional momentum narrative with actual values"
  },
  "layer3Analysis": {
    "entryZone": "Specific price range",
    "bollinger": "BB position with actual values",
    "pivotPoints": "Nearest pivot levels with values",
    "volume": "Volume analysis with actual values",
    "atr": "ATR-based SL calculation with values",
    "summary": "3-4 sentence professional entry narrative with actual values"
  },
  "management": {
    "tp1Action": "At TP1: Close 40%, move SL to entry",
    "tp2Action": "At TP2: Close 30%, move SL to TP1",
    "tp3Action": "TP3: Let 30% run with trailing stop = ATR"
  },
  "failureScenario": {
    "invalidation": "Specific price level that invalidates analysis",
    "reverseLevel": "Price level for reverse entry",
    "reverseOpportunity": "Reverse trade description"
  },
  "timing": {
    "dataTime": "Timestamp from data",
    "marketStatus": "Current session status",
    "bestTradingTime": "Recommended trading window in Dubai time"
  },
  "keyLevels": {
    "strongResistance": [number, number],
    "strongSupport": [number, number],
    "dailyPivot": number
  }
}

CRITICAL RULES:
1. USE actual indicator values — cite real numbers from the data.
2. NEVER mention missing data, unavailable indicators, HTML, or source errors.
3. marketOverview.summary = professional narrative, NOT indicator list.
4. If WAIT: set entry/SL/TP/riskReward to 0, explain via analysis text.
5. If score >= 50: MUST provide specific entry/SL/TP values.
6. TP ratios: TP1=1:1.5, TP2=1:2.5, TP3=1:4 from entry.
7. SL: ATR x 1.5 OR nearest strong S/R.
8. Lot: $20 / (SL pips x pip value).

DATA:
{{DATA}}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const dataRes = await fetch(`${supabaseUrl}/storage/v1/object/public/market-data/XAUUSDm_Complete_Data.txt?t=${Date.now()}`);
    if (!dataRes.ok) throw new Error("Failed to fetch market data from storage");
    const rawData = await dataRes.text();
    if (!hasValidMarketDataPayload(rawData)) throw new Error("Market data source returned invalid HTML/auth content");

    const prompt = FULL_PROMPT.replace("{{DATA}}", rawData);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting scheduled gold analysis...");
    console.log("Data length:", rawData.length, "chars");

    // Set broadcast to UPDATING
    await supabase.from("broadcast_state").upsert({
      id: "global", status: "updating", error: null, current_slide: 0,
      slide_started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: "You are a professional quantitative gold trading analyst. You MUST analyze all the provided technical indicator data carefully and cite actual values. Always respond with valid JSON only, no markdown formatting, no code blocks. Just raw JSON. Never mention missing data or source errors.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI API error:", response.status, t);
      await supabase.from("broadcast_state").upsert({
        id: "global", status: "maintenance", analysis: null,
        error: "AI service unavailable", updated_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ error: "AI API error", status: response.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

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
      await supabase.from("broadcast_state").upsert({
        id: "global", status: "maintenance", analysis: null,
        error: "Quality check failed", updated_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ error: "Quality failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("gold_analysis").insert({ analysis: parsed });

    const now2 = new Date(), nxt = new Date(now2);
    nxt.setMinutes(Math.ceil((now2.getMinutes() + 1) / 5) * 5, 0, 0);
    if (nxt <= now2) nxt.setMinutes(nxt.getMinutes() + 5);

    await supabase.from("broadcast_state").upsert({
      id: "global", status: "live", analysis: parsed, error: null,
      current_slide: 0, slide_started_at: new Date().toISOString(),
      next_update_at: nxt.toISOString(), updated_at: new Date().toISOString(),
    });
    console.log("Broadcast set to LIVE");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scheduled-analysis error:", e);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await sb.from("broadcast_state").upsert({
        id: "global", status: "maintenance", analysis: null,
        error: String(e), updated_at: new Date().toISOString(),
      });
    } catch {}
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
