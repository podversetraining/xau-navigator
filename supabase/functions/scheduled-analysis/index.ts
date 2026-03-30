import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildPrompt(rawData: string): string {
  return `You are a professional quantitative analyst specializing in Gold trading (XAUUSD).

IMPORTANT: The data below contains COMPLETE technical indicator data for 7 timeframes (D1, H4, H1, M30, M15, M5, M1) with 90+ indicators each. READ ALL THE DATA CAREFULLY before responding.

The data includes: EMAs, SMAs, WMA, RSI variants, MACD, Stochastic, Williams %R, CCI, Momentum, DeMarker, ADX, ATR, Bollinger Bands, Keltner Channels, SuperTrend, Alligator, Aroon, Vortex, TRIX, Ichimoku Cloud, Fibonacci levels, Pivot Points, Volume, MFI, Fractals, PSAR, and more.

TASK: Analyze ALL the provided data and provide ONE comprehensive trade recommendation.

CORE PRINCIPLE:
- Required: alignment of 3 main layers (Trend + Momentum + Confirmation)
- If 70% of indicators align = sufficient signal
- Conflicting indicators are natural - majority direction matters

LAYER 1: Dominant Trend (Weight: 40%) — From D1 and H4
LAYER 2: Momentum & Timing (Weight: 35%) — From H1, M30, M15
LAYER 3: Precise Entry & Confirmation (Weight: 25%) — From M15, M5, M1

SCORING: Layer1: _/40 | Layer2: _/35 | Layer3: _/25 | Total: _/100
<50: WAIT | 50-64: Weak | 65-79: Good | 80-89: Strong | 90-100: Excellent

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):
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
  "lotSize": 0.01,
  "lotCalculation": "0.01 lot per $1,000 account balance",
  "marketOverview": {
    "overallBias": "Bullish" or "Bearish" or "Neutral",
    "summary": "2-3 sentence market overview explaining the current state",
    "timeframes": [
      {"timeframe": "D1", "trend": "Bullish/Bearish/Sideways", "momentum": "Bullish/Bearish/Neutral", "strength": 0-100, "keySignal": "short description"},
      {"timeframe": "H4", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "H1", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "M30", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "M15", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "M5", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."},
      {"timeframe": "M1", "trend": "...", "momentum": "...", "strength": 0-100, "keySignal": "..."}
    ]
  },
  "layer1Analysis": {
    "trend": "Bullish" or "Bearish" or "Sideways",
    "strength": number,
    "emaOrder": "describe EMA alignment based on actual EMA values from the data",
    "superTrend": "describe SuperTrend status from the data",
    "alligator": "describe Alligator state from the data",
    "ichimoku": "describe Ichimoku cloud position from the data",
    "fibonacci": "describe price position relative to Fibonacci levels",
    "summary": "2-3 sentence trend summary using actual indicator values"
  },
  "layer2Analysis": {
    "momentum": "Bullish" or "Bearish" or "Neutral",
    "strength": number,
    "rsi": "describe RSI readings across timeframes with actual values",
    "macd": "describe MACD status with actual values",
    "stochastic": "describe Stochastic readings with actual values",
    "divergence": "describe any divergences found between price and indicators",
    "summary": "2-3 sentence momentum summary using actual indicator values"
  },
  "layer3Analysis": {
    "entryZone": "specific price zone for entry",
    "bollinger": "describe BB position with actual values",
    "pivotPoints": "describe pivot levels with actual values",
    "volume": "describe volume analysis with actual values",
    "atr": "describe ATR for stop loss calculation with actual values",
    "summary": "2-3 sentence entry analysis using actual indicator values"
  },
  "management": {
    "tp1Action": "Close 40%, move SL to entry",
    "tp2Action": "Close 30%, move SL to TP1",
    "tp3Action": "Let remaining 30% run with trailing stop = ATR"
  },
  "failureScenario": {
    "invalidation": "specific price level that invalidates the trade",
    "reverseLevel": "price level for reverse entry",
    "reverseOpportunity": "describe reverse trade opportunity"
  },
  "timing": {
    "dataTime": "timestamp from the data",
    "marketStatus": "current market session status",
    "bestTradingTime": "recommended trading window"
  },
  "keyLevels": {
    "strongResistance": [number, number],
    "strongSupport": [number, number],
    "dailyPivot": number
  }
}

CRITICAL RULES:
1. USE the actual indicator values from the data below. Do NOT say "no data available" or "unable to analyze"
2. Every field must have meaningful content derived from the actual data
3. If recommendation is WAIT, still fill all analysis fields with actual market observations
4. All number fields must have real values from the data

DATA:
${rawData}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const APP_URL = Deno.env.get("APP_URL") || "https://f24df3d3-4ed9-4e23-a824-77d960876447.lovableproject.com";
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
    console.log("Data length:", rawData.length, "chars");

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
        system: "You are a professional quantitative gold trading analyst. You MUST analyze all the provided technical indicator data carefully. Always respond with valid JSON only, no markdown formatting, no code blocks. Just raw JSON. Never say 'no data available' — the data IS provided to you.",
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
