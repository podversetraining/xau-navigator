import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// The analysis prompt template
function buildPrompt(rawData: string): string {
  return `You are a professional quantitative analyst specializing in Gold trading (XAUUSD) using a multi-layer analysis system.

The attached data contains 7 timeframes (D1, H4, H1, M30, M15, M5, M1) with 90+ technical indicators each.

TASK: Provide ONE specific trade recommendation with exact numbers.

CORE PRINCIPLE:
- Don't require all indicators to align (this kills trades)
- Required: alignment of 3 main layers only (Trend + Momentum + Confirmation)
- Conflicting indicators are natural - majority direction matters
- If 70% of indicators align = sufficient signal

LAYER 1: Dominant Trend (Weight: 40%)
Analyze from D1 and H4: EMAs order, SMAs, WMA, Trend Classification, SuperTrend, Alligator, Aroon, Vortex, TRIX, ADXR, Ichimoku Cloud, Fibonacci levels.

LAYER 2: Momentum & Timing (Weight: 35%)
Analyze from H1, M30, M15: RSI variants, MACD, Stochastic, Williams %R, CCI, Momentum, ROC, DeMarker. Check for divergences.

LAYER 3: Precise Entry & Confirmation (Weight: 25%)
Analyze from M15, M5, M1: Bollinger Bands, Keltner Channels, Pivot Points, SuperTrend, PSAR, Fractals, ATR, Volume, MFI.

SCORING:
Layer 1 (Trend): _/40
Layer 2 (Momentum): _/35
Layer 3 (Entry): _/25
Total: _/100
<50: WAIT | 50-64: Weak | 65-79: Good | 80-89: Strong | 90-100: Excellent

RESPOND IN THIS EXACT JSON FORMAT:
{
  "recommendation": "BUY" or "SELL" or "WAIT",
  "tradeType": "Scalping" or "Intraday" or "Swing",
  "score": {
    "layer1": number,
    "layer2": number,
    "layer3": number,
    "total": number,
    "rating": "Weak" or "Good" or "Strong" or "Excellent"
  },
  "entry": number,
  "stopLoss": number,
  "tp1": number,
  "tp2": number,
  "tp3": number,
  "riskReward": number,
  "lotSize": number,
  "lotCalculation": "string explaining calculation",
  "layer1Analysis": {
    "trend": "Bullish" or "Bearish" or "Sideways",
    "strength": number,
    "emaOrder": "string",
    "superTrend": "string",
    "alligator": "string",
    "ichimoku": "string",
    "fibonacci": "string",
    "summary": "string"
  },
  "layer2Analysis": {
    "momentum": "Bullish" or "Bearish" or "Neutral",
    "strength": number,
    "rsi": "string",
    "macd": "string",
    "stochastic": "string",
    "divergence": "string",
    "summary": "string"
  },
  "layer3Analysis": {
    "entryZone": "string",
    "bollinger": "string",
    "pivotPoints": "string",
    "volume": "string",
    "atr": "string",
    "summary": "string"
  },
  "management": {
    "tp1Action": "Close 40%, move SL to entry",
    "tp2Action": "Close 30%, move SL to TP1",
    "tp3Action": "Let remaining 30% run with trailing stop = ATR"
  },
  "failureScenario": {
    "invalidation": "string",
    "reverseLevel": "string",
    "reverseOpportunity": "string"
  },
  "timing": {
    "dataTime": "string",
    "marketStatus": "string",
    "bestTradingTime": "string"
  },
  "keyLevels": {
    "strongResistance": [number],
    "strongSupport": [number],
    "dailyPivot": number
  }
}

DATA:
${rawData}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Fetch market data from the published app
    const APP_URL = Deno.env.get("APP_URL") || "https://id-preview--f24df3d3-4ed9-4e23-a824-77d960876447.lovable.app";
    const dataRes = await fetch(`${APP_URL}/data/XAUUSDm_Complete_Data.txt?t=${Date.now()}`);
    if (!dataRes.ok) throw new Error("Failed to fetch market data from app");
    const rawData = await dataRes.text();

    const prompt = buildPrompt(rawData);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting scheduled gold analysis...");

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
        system: "You are a professional quantitative gold trading analyst. Always respond with valid JSON only, no markdown formatting, no code blocks. Just raw JSON.",
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI API error", status: response.status }), {
        status: 500,
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

    // Save to database — triggers realtime for all clients
    const { error: dbError } = await supabase
      .from("gold_analysis")
      .insert({ analysis: parsed });

    if (dbError) {
      console.error("DB insert error:", dbError);
    } else {
      console.log("Analysis saved successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scheduled-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
