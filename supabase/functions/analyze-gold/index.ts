import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BROADCAST_ID = "global";
const invalidSourcePatterns = [/<!doctype html/i, /<html/i, /authentication page/i, /sign in/i, /login/i, /auth/i];
const invalidAnalysisPatterns = [
  /insufficient data/i, /no (?:technical |market |indicator )?data (?:is )?(?:available|provided)/i,
  /cannot (?:perform|determine|analyze|assess)/i, /unable to (?:analyze|determine)/i,
  /html markup/i, /authentication page/i, /lacks all required technical indicators/i, /timestamp not available/i,
];

function hasValidMarketDataPayload(rawData: string): boolean {
  const t = rawData.trim();
  if (!t) return false;
  if (invalidSourcePatterns.some((p) => p.test(t))) return false;
  return t.includes("--- Timeframe:") && /EMA_8:/i.test(t) && /RSI:/i.test(t) && /MACD:/i.test(t) && /ATR:/i.test(t);
}
function containsInvalid(v: unknown): boolean {
  if (typeof v === "string") return invalidAnalysisPatterns.some((p) => p.test(v.trim()));
  if (Array.isArray(v)) return v.some(containsInvalid);
  if (v && typeof v === "object") return Object.values(v).some(containsInvalid);
  return false;
}
function isUsable(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  const ov = a.marketOverview as { summary?: string; timeframes?: unknown[] } | undefined;
  return ["BUY","SELL","WAIT"].includes(String(a.recommendation)) && typeof ov?.summary === "string" && ov.summary.trim().length > 0 && Array.isArray(ov?.timeframes) && ov!.timeframes!.length > 0 && !containsInvalid(v);
}
function nextSlot(): string {
  const now = new Date(), n = new Date(now);
  const m = now.getMinutes();
  n.setMinutes(Math.ceil((m + 1) / 5) * 5, 0, 0);
  if (n <= now) n.setMinutes(n.getMinutes() + 5);
  return n.toISOString();
}
function getSupabase() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
async function setBroadcast(sb: ReturnType<typeof createClient>, patch: Record<string, unknown>) {
  await sb.from("broadcast_state").upsert({ id: BROADCAST_ID, updated_at: new Date().toISOString(), ...patch });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = getSupabase();
  try {
    const body = await req.json();
    const { prompt, rawData } = body || {};
    if (!prompt || typeof prompt !== "string") return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!rawData || !hasValidMarketDataPayload(rawData)) return new Response(JSON.stringify({ error: "Invalid data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!KEY) throw new Error("ANTHROPIC_API_KEY missing");

    // Set UPDATING
    await setBroadcast(sb, { status: "updating", error: null, current_slide: 0, slide_started_at: new Date().toISOString(), next_update_at: nextSlot() });

    let parsed: unknown = null;
    for (let i = 0; i < 2; i++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8192, system: "You are a professional quantitative gold trading analyst. Respond with valid JSON only. Never mention missing data.", messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) {
        console.error("AI error:", res.status, await res.text().catch(() => ""));
        await setBroadcast(sb, { status: "maintenance", analysis: null, error: "AI unavailable", next_update_at: nextSlot() });
        return new Response(JSON.stringify({ ok: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const d = await res.json();
      const txt = d.content?.[0]?.text || "";
      try {
        let c = txt.trim();
        if (c.startsWith("```")) c = c.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        parsed = JSON.parse(c);
      } catch { parsed = null; continue; }
      if (!isUsable(parsed)) { parsed = null; continue; }
      break;
    }
    if (!parsed) {
      await setBroadcast(sb, { status: "maintenance", analysis: null, error: "Quality check failed", next_update_at: nextSlot() });
      return new Response(JSON.stringify({ ok: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await sb.from("gold_analysis").insert({ analysis: parsed });
    await setBroadcast(sb, { status: "live", analysis: parsed as Record<string, unknown>, error: null, current_slide: 0, slide_started_at: new Date().toISOString(), next_update_at: nextSlot() });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-gold error:", e);
    try { await setBroadcast(sb, { status: "maintenance", analysis: null, error: String(e), next_update_at: nextSlot() }); } catch {}
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
