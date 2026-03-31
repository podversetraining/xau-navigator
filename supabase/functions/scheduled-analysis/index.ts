import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BROADCAST_ID = "global";
const MODEL_NAME = "claude-sonnet-4-6";
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
  if (total < 75 && analysis.recommendation !== "WAIT") {
    return {
      ...analysis,
      recommendation: "WAIT",
      conviction: "No Trade",
      entry: 0, stopLoss: 0, tp1: 0, tp2: 0, tp3: 0,
      riskReward: 0, lotSize: 0,
      score: { ...score, rating: "No Trade", threshold: 75 },
    };
  }
  return analysis;
}

// The full prompt is imported from the client-side fullPrompt.ts at build time.
// We inline the same prompt here for the edge function.
const FULL_PROMPT = `You are an institutional-grade quantitative analyst specializing in Gold (XAUUSD) using a proprietary multi-layer analysis engine.

The data below contains COMPLETE technical indicator data for 7 timeframes (D1, H4, H1, M30, M15, M5, M1) with 90+ indicators each. READ ALL THE DATA CAREFULLY.

DETERMINISM MANDATE:
- The same input data MUST produce the same JSON output every time.
- Use a fixed rule-based process only. No creativity, no discretionary re-weighting, no random judgment.
- For each referenced indicator, classify it as Bullish, Bearish, or Neutral strictly from its numeric value or explicit state in the input.
- Neutral votes are excluded from directional majority counts but tracked separately as "neutral_count".
- For each layer, count Bullish votes and Bearish votes separately.
- Layer direction rule: if Bullish votes > Bearish votes → Bullish. If Bearish > Bullish → Bearish. If equal → Neutral/Sideways.
- Layer strength rule: round((winning_directional_votes / max(1, bullish_votes + bearish_votes)) × 100).
- Layer points: layer1 = round(strength × 0.40), layer2 = round(strength × 0.35), layer3 = round(strength × 0.25).
- Total score = layer1_points + layer2_points + layer3_points.
- Never alternate BUY, SELL, or WAIT for identical input.

MINIMUM THRESHOLD: 75 (Strong Signals Only)
- WAIT if total < 75.
- BUY if total >= 75 AND layer1 = Bullish AND layer2 = Bullish AND (layer3 = Bullish OR Neutral).
- SELL if total >= 75 AND layer1 = Bearish AND layer2 = Bearish AND (layer3 = Bearish OR Neutral).

LAYER OVERRIDE RULE (anti-choke):
- If Layer 1 strength >= 75% AND Layer 2 strength >= 70%, Layer 3 Neutral does NOT block.
- If Layer 2 strength >= 80% AND total >= 70, upgrade from WAIT if Layer 1 agrees.
- If all 3 layers agree AND total >= 72, execute (momentum confirmation override).

CONVICTION TIERS: <75: No Trade | 75-84: Confirmed | 85-94: Strong | 95+: High Conviction
Lot size ALWAYS 0.01 per $1,000 regardless of conviction.

LAYER 1: Dominant Trend (40%) — D1 & H4
1A: Moving Average Structure (6 votes): EMA Ribbon, SMA Alignment, WMA_21, EMA_8 vs EMA_21, Price vs EMA_200, D1/H4 agreement.
1B: Advanced Trend (7 votes): Trend_Classification, Trend_Strength_Index, SuperTrend, Alligator, Aroon_Oscillator, Vortex_Diff, TRIX. Evaluate on BOTH D1 and H4.
1C: Ichimoku (5 votes): Cloud_Position, Tenkan vs Kijun, Chikou, Cloud Thickness, Future Cloud Color.
1D: Fibonacci (3 votes): Fib Trend_Direction, Price_Position_in_Range, Confluence Alert.

LAYER 2: Momentum & Timing (35%) — H1, M30, M15
2A: RSI Cluster (3 votes): RSI_14 per timeframe (>55 Bull, <45 Bear).
2B: MACD Family (3 votes): MACD vs Signal + Histogram direction.
2C: Stochastic & Williams %R (3 votes).
2D: Secondary Momentum (3 votes): CCI_20, Momentum_14, ROC_12.
2E: Smart Money Filter (2 votes): DeMarker exhaustion, MFI_14 divergence.
2F: Divergence Detection (adds 2 votes): Price vs RSI/MACD on H1/M30.

LAYER 3: Entry Precision (25%) — M15, M5, M1
3A: Bollinger & Channel (3 votes).
3B: S/R Decision Points (3 votes): Pivots, SuperTrend, PSAR, Fractals.
3C: Volume Validation (3 votes): Relative_Volume, Volume_ROC, MFI_14.
3D: Volatility-Adaptive SL: ATR × multiplier based on Volatility_Ratio.
3E: Entry Zone Optimization.

DYNAMIC TP TARGETS anchored to actual S/R levels. Fallback: TP1=1.5×SL, TP2=2.5×SL, TP3=4.0×SL.

FALSE SIGNAL FILTERS (all 5 must be evaluated):
F1: Volume Confirmation (Relative_Volume < 0.3 → WAIT).
F2: Trend-Momentum Alignment (strength diff > 30% → WAIT).
F3: Exhaustion Guard (DeMarker extreme on 2+ TFs → WAIT).
F4: Bollinger Squeeze Trap (BB_Width < 0.5 + no SuperTrend change → WAIT).
F5: D1 Counter-Trend Guard (against D1 requires score >= 85, L2 >= 75%).

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):
{
  "recommendation": "BUY" or "SELL" or "WAIT",
  "tradeType": "Scalping" or "Intraday" or "Swing",
  "conviction": "No Trade" or "Confirmed" or "Strong" or "High Conviction",
  "score": {"layer1": number, "layer2": number, "layer3": number, "total": number, "threshold": 75, "rating": "No Trade/Confirmed/Strong/High Conviction"},
  "votes": {
    "layer1": {"bullish": number, "bearish": number, "neutral": number},
    "layer2": {"bullish": number, "bearish": number, "neutral": number},
    "layer3": {"bullish": number, "bearish": number, "neutral": number}
  },
  "filtersApplied": {
    "volumeConfirmation": "PASS/FAIL/EXEMPT_SESSION_OPEN",
    "trendMomentumAlignment": "PASS/FAIL",
    "exhaustionGuard": "PASS/FAIL",
    "bollingerSqueeze": "PASS/FAIL/N/A",
    "counterTrendGuard": "PASS/FAIL/N/A"
  },
  "entry": number, "stopLoss": number, "tp1": number, "tp2": number, "tp3": number,
  "riskReward": number, "lotSize": number,
  "lotCalculation": "string",
  "marketOverview": {
    "overallBias": "Bullish/Bearish/Neutral",
    "summary": "4-5 sentence professional narrative",
    "timeframes": [{"timeframe":"D1","trend":"...","momentum":"...","strength":0-100,"keySignal":"..."}, ...]
  },
  "layer1Analysis": {"trend":"...","strength":number,"emaOrder":"...","superTrend":"...","alligator":"...","ichimoku":"...","fibonacci":"...","summary":"..."},
  "layer2Analysis": {"momentum":"...","strength":number,"rsi":"...","macd":"...","stochastic":"...","smartMoney":"...","divergence":"...","summary":"..."},
  "layer3Analysis": {"entryZone":"...","bollinger":"...","pivotPoints":"...","volume":"...","atr":"...","summary":"..."},
  "management": {"tp1Action":"...","tp2Action":"...","tp3Action":"..."},
  "failureScenario": {"invalidation":"...","reverseLevel":"...","reverseOpportunity":"..."},
  "timing": {"dataTime":"...","marketStatus":"...","bestTradingTime":"...","sessionContext":"..."},
  "keyLevels": {"strongResistance":[number,number],"strongSupport":[number,number],"dailyPivot":number,"fibConfluence":"..."}
}

CRITICAL RULES:
1. USE actual indicator values — cite real numbers.
2. NEVER mention missing data, HTML, or source errors.
3. marketOverview.summary = professional narrative, NOT indicator list.
4. If WAIT: set entry/SL/TP to 0, lotSize to 0.
5. If total >= 75: MUST provide specific entry/SL/TP values.
6. All 5 filters must be evaluated in filtersApplied.
7. Lot size ALWAYS 0.01 per $1,000. WAIT = 0.
8. Votes object must accurately reflect counting for auditability.

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
  if (total >= 95) return "High Conviction";
  if (total >= 85) return "Strong";
  if (total >= 75) return "Confirmed";
  return "No Trade";
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
  if (total < 75) return "WAIT";

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
