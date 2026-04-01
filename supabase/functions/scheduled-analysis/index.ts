import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BROADCAST_ID = "global";
const MODEL_NAME = "gpt-4.1";
const SLOTS = [1, 16, 31, 46] as const;

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

function enforceThreshold(analysis: AnalysisRecord): AnalysisRecord {
  const score = analysis.score as { total?: number; rating?: string } | undefined;
  const total = typeof score?.total === "number" ? score.total : 0;
  if (total < 65 && analysis.recommendation !== "WAIT") {
    return {
      ...analysis,
      recommendation: "WAIT",
      entry: 0, stopLoss: 0, tp1: 0, tp2: 0, tp3: 0,
      riskReward: 0, lotSize: 0,
      score: { ...score, rating: "Insufficient" },
    };
  }
  return analysis;
}

const FULL_PROMPT = `You are a professional quantitative analyst specializing in Gold trading (XAUUSD) using a multi-layer analysis system.

The data below contains COMPLETE technical indicator data for 7 timeframes (D1, H4, H1, M30, M15, M5, M1) with 90+ indicators each. READ ALL THE DATA CAREFULLY.

DETERMINISM MANDATE:
- The same input data MUST produce the same JSON output every time.
- Use a fixed rule-based process only. No creativity, no discretionary re-weighting, no random judgment.
- For each referenced indicator, classify it as Bullish, Bearish, or Neutral strictly from its numeric value or explicit state in the input.
- Ignore Neutral votes in directional majority.
- For each layer, count Bullish votes and Bearish votes separately.
- Layer direction rule: if Bullish votes > Bearish votes, direction = Bullish. If Bearish votes > Bullish votes, direction = Bearish. If equal, direction = Neutral/Sideways.
- Layer strength rule: round((winning directional votes / max(1, bullish votes + bearish votes)) * 100).
- Layer points rule: layer1 points = round(layer1 strength * 0.40), layer2 points = round(layer2 strength * 0.35), layer3 points = round(layer3 strength * 0.25).
- Total score rule: total = layer1 points + layer2 points + layer3 points.
- Final recommendation rule is strict: WAIT if total < 65. BUY only if total >= 65 and layer 1 is Bullish and layer 2 is Bullish and layer 3 is Bullish or Neutral. SELL only if total >= 65 and layer 1 is Bearish and layer 2 is Bearish and layer 3 is Bearish or Neutral. Otherwise WAIT.
- Scores below 65 are too weak — always output WAIT for those.
- Never alternate BUY, SELL, or WAIT for identical input.

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
<65: WAIT (no trade issued) | 65-79: Good | 80-89: Strong | 90-100: Excellent

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):
{
  "recommendation": "BUY" or "SELL" or "WAIT",
  "tradeType": "Scalping" or "Intraday" or "Swing",
  "score": {"layer1": number, "layer2": number, "layer3": number, "total": number, "rating": "Good/Strong/Excellent"},
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
5. If score >= 65: MUST provide specific entry/SL/TP values.
6. TP ratios: TP1=1:1.5, TP2=1:2.5, TP3=1:4 from entry.
7. SL: ATR x 1.5 OR nearest strong S/R.
8. Lot: $20 / (SL pips x pip value).

DATA:
{{DATA}}`;

type AnalysisRecord = Record<string, unknown>;

type BroadcastRow = {
  status?: string;
  analysis?: unknown;
  slide_started_at?: string;
  updated_at?: string;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeBias(value: unknown): "Bullish" | "Bearish" | "Neutral" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "Neutral";
  if (normalized.includes("bull") || normalized.includes("buy")) return "Bullish";
  if (normalized.includes("bear") || normalized.includes("sell")) return "Bearish";
  return "Neutral";
}

function getCurrentSlotStart(from = new Date()): Date {
  const slotStart = new Date(from);
  slotStart.setSeconds(0, 0);
  const min = slotStart.getMinutes();
  const slot = [...SLOTS].reverse().find((value) => value <= min) ?? SLOTS[SLOTS.length - 1];
  if (slot > min) slotStart.setHours(slotStart.getHours() - 1);
  slotStart.setMinutes(slot, 0, 0);
  return slotStart;
}

function getSlotKey(from = new Date()): string {
  return getCurrentSlotStart(from).toISOString();
}

function isScheduledExecutionWindow(from = new Date()): boolean {
  return SLOTS.includes(from.getMinutes() as (typeof SLOTS)[number]);
}

function getRating(total: number): string {
  if (total >= 90) return "Excellent";
  if (total >= 80) return "Strong";
  if (total >= 65) return "Good";
  return "Insufficient";
}

function extractMetaString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const meta = (value as Record<string, unknown>)._meta;
  if (!meta || typeof meta !== "object") return null;
  const resolved = (meta as Record<string, unknown>)[key];
  return typeof resolved === "string" ? resolved : null;
}

function extractSlotKey(value: unknown): string | null {
  return extractMetaString(value, "slotKey");
}

function hasValidTradeLevels(analysis: AnalysisRecord): boolean {
  const entry = toFiniteNumber(analysis.entry);
  const stopLoss = toFiniteNumber(analysis.stopLoss);
  const tp1 = toFiniteNumber(analysis.tp1);
  const tp2 = toFiniteNumber(analysis.tp2);
  const tp3 = toFiniteNumber(analysis.tp3);

  return entry > 0 && stopLoss > 0 && tp1 > 0 && tp2 > 0 && tp3 > 0 && entry !== stopLoss;
}

function deriveRecommendation(analysis: AnalysisRecord, total: number): "BUY" | "SELL" | "WAIT" {
  if (total < 65) return "WAIT";

  const layer1Trend = normalizeBias((analysis.layer1Analysis as Record<string, unknown> | undefined)?.trend);
  const layer2Momentum = normalizeBias((analysis.layer2Analysis as Record<string, unknown> | undefined)?.momentum);
  const overallBias = normalizeBias((analysis.marketOverview as Record<string, unknown> | undefined)?.overallBias);

  if (layer1Trend === "Bullish" && layer2Momentum === "Bullish" && overallBias !== "Bearish") return "BUY";
  if (layer1Trend === "Bearish" && layer2Momentum === "Bearish" && overallBias !== "Bullish") return "SELL";

  return "WAIT";
}

function normalizeAnalysis(analysis: AnalysisRecord): AnalysisRecord {
  const rawScore = (analysis.score as Record<string, unknown> | undefined) ?? {};
  const layer1 = clamp(Math.round(toFiniteNumber(rawScore.layer1)), 0, 40);
  const layer2 = clamp(Math.round(toFiniteNumber(rawScore.layer2)), 0, 35);
  const layer3 = clamp(Math.round(toFiniteNumber(rawScore.layer3)), 0, 25);
  const total = layer1 + layer2 + layer3;
  const recommendation = deriveRecommendation(analysis, total);
  const tradable = recommendation !== "WAIT" && hasValidTradeLevels(analysis);

  return {
    ...analysis,
    recommendation: tradable ? recommendation : "WAIT",
    score: {
      ...rawScore,
      layer1,
      layer2,
      layer3,
      total,
      rating: getRating(total),
    },
    entry: tradable ? toFiniteNumber(analysis.entry) : 0,
    stopLoss: tradable ? toFiniteNumber(analysis.stopLoss) : 0,
    tp1: tradable ? toFiniteNumber(analysis.tp1) : 0,
    tp2: tradable ? toFiniteNumber(analysis.tp2) : 0,
    tp3: tradable ? toFiniteNumber(analysis.tp3) : 0,
    riskReward: tradable ? toFiniteNumber(analysis.riskReward) : 0,
    lotSize: tradable ? 0.01 : 0,
    lotCalculation: tradable
      ? "Fixed display size: 0.01 lot per $1,000"
      : "No trade — only Good, Strong, and Excellent signals are allowed",
  };
}

function getNextScheduledTime(from = new Date()): string {
  const min = from.getMinutes();
  const nextSlot = SLOTS.find((slot) => slot > min) ?? SLOTS[0];
  const next = new Date(from);
  if (nextSlot <= min) next.setHours(next.getHours() + 1);
  next.setMinutes(nextSlot, 0, 0);
  next.setSeconds(0, 0);
  return next.toISOString();
}

async function sha256Base64(value: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}

function extractInputHash(value: unknown): string | null {
  return extractMetaString(value, "inputHash");
}

function attachMeta(analysis: AnalysisRecord, inputHash: string, slotKey: string): AnalysisRecord {
  const existingMeta = analysis._meta;
  const safeMeta = existingMeta && typeof existingMeta === "object" ? existingMeta as Record<string, unknown> : {};

  return {
    ...analysis,
    _meta: {
      ...safeMeta,
      inputHash,
      slotKey,
      model: MODEL_NAME,
      generatedAt: new Date().toISOString(),
    },
  };
}

async function setBroadcast(supabase: ReturnType<typeof createClient>, patch: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    id: BROADCAST_ID,
    updated_at: new Date().toISOString(),
    ...patch,
  };

  if (!Object.prototype.hasOwnProperty.call(payload, "next_update_at")) {
    payload.next_update_at = getNextScheduledTime();
  }

  await supabase.from("broadcast_state").upsert(payload);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const force = (body as Record<string, unknown>).force === true;
    const now = new Date();
    const slotKey = getSlotKey(now);
    if (!force && !isScheduledExecutionWindow(now)) {
      console.log("Ignoring out-of-schedule invocation", now.toISOString());
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "outside_schedule", slotKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dataRes = await fetch(`http://88.99.64.228/XAUUSDm_Complete_Data.txt?t=${Date.now()}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/plain,*/*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });
    if (!dataRes.ok) throw new Error("Failed to fetch market data from storage");
    const rawData = await dataRes.text();
    if (!hasValidMarketDataPayload(rawData)) throw new Error("Market data source returned invalid HTML/auth content");

    const prompt = FULL_PROMPT.replace("{{DATA}}", rawData);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const inputHash = await sha256Base64(rawData);

    console.log("Starting scheduled gold analysis...");
    console.log("Data length:", rawData.length, "chars");

    const { data: currentBroadcast } = await supabase
      .from("broadcast_state")
      .select("status, analysis, slide_started_at, updated_at")
      .eq("id", BROADCAST_ID)
      .maybeSingle<BroadcastRow>();

    const currentAnalysis = currentBroadcast?.analysis;
    if (
      currentBroadcast?.status === "updating" &&
      currentBroadcast.updated_at &&
      getSlotKey(new Date(currentBroadcast.updated_at)) === slotKey
    ) {
      console.log("Analysis already running for current slot", slotKey);
      return new Response(JSON.stringify({ success: true, pending: true, slotKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      currentBroadcast?.status === "live" &&
      currentAnalysis &&
      extractSlotKey(currentAnalysis) === slotKey &&
      isUsableAnalysis(currentAnalysis)
    ) {
      console.log("Reused current broadcast analysis for slot", slotKey);
      return new Response(JSON.stringify({ success: true, cached: true, slotKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      currentBroadcast?.status === "live" &&
      currentAnalysis &&
      extractInputHash(currentAnalysis) === inputHash &&
      isUsableAnalysis(currentAnalysis)
    ) {
      const normalizedCurrent = attachMeta(normalizeAnalysis(currentAnalysis as AnalysisRecord), inputHash, slotKey);
      await setBroadcast(supabase, {
        status: "live",
        analysis: normalizedCurrent,
        error: null,
        current_slide: 0,
        slide_started_at: new Date().toISOString(),
      });
      console.log("Reused current broadcast analysis for identical market snapshot");
      return new Response(JSON.stringify({ success: true, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: latestCached } = await supabase
      .from("gold_analysis")
      .select("analysis")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cachedAnalysis = latestCached?.analysis;
    if (cachedAnalysis && extractInputHash(cachedAnalysis) === inputHash && isUsableAnalysis(cachedAnalysis)) {
      const normalizedCached = attachMeta(normalizeAnalysis(cachedAnalysis as AnalysisRecord), inputHash, slotKey);
      await setBroadcast(supabase, {
        status: "live",
        analysis: normalizedCached,
        error: null,
        current_slide: 0,
        slide_started_at: new Date().toISOString(),
      });
      console.log("Reused cached analysis from database for identical market snapshot");
      return new Response(JSON.stringify({ success: true, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set broadcast to UPDATING
    await setBroadcast(supabase, {
      status: "updating",
      analysis: null,
      error: null,
      current_slide: 0,
      slide_started_at: new Date().toISOString(),
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        max_tokens: 8192,
        temperature: 0,
        system: "You are a professional quantitative gold trading analyst. You MUST analyze all the provided technical indicator data carefully and cite actual values. Always respond with valid JSON only, no markdown formatting, no code blocks. Just raw JSON. Never mention missing data or source errors. Same input must produce the same output. Reject weak signals below 65/100. Only Good, Strong, and Excellent signals can become trades. Use a fixed display lot size of 0.01 per $1,000 for valid trades.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI API error:", response.status, t);
      await setBroadcast(supabase, {
        status: "maintenance",
        analysis: null,
        error: "AI service unavailable",
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
      parsed = null;
    }

    if (!isUsableAnalysis(parsed)) {
      await setBroadcast(supabase, {
        status: "maintenance",
        analysis: null,
        error: "Quality check failed",
      });
      return new Response(JSON.stringify({ error: "Quality failed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enforcedAnalysis = normalizeAnalysis(enforceThreshold(parsed as AnalysisRecord));
    const normalizedAnalysis = attachMeta(enforcedAnalysis, inputHash, slotKey);

    await supabase.from("gold_analysis").insert({ analysis: normalizedAnalysis });

    await setBroadcast(supabase, {
      status: "live",
      analysis: normalizedAnalysis,
      error: null,
      current_slide: 0,
      slide_started_at: new Date().toISOString(),
    });
    console.log("Broadcast set to LIVE");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scheduled-analysis error:", e);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await setBroadcast(sb, {
        status: "maintenance",
        analysis: null,
        error: String(e),
      });
    } catch {}
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
