import type { AnalysisResult } from "@/types/analysis";

const INVALID_SOURCE_PATTERNS = [
  /<!doctype html/i,
  /<html/i,
  /authentication page/i,
  /sign in/i,
  /login/i,
  /auth/i,
];

const INVALID_ANALYSIS_PATTERNS = [
  /insufficient data/i,
  /no (?:technical |market |indicator )?data (?:is )?(?:available|provided)/i,
  /cannot (?:perform|determine|analyze|assess)/i,
  /unable to (?:analyze|determine)/i,
  /html markup/i,
  /authentication page/i,
  /lacks all required technical indicators/i,
  /requires current market session information/i,
  /timestamp not available/i,
  /no market timestamp available/i,
];

function containsInvalidAnalysisText(value: unknown): boolean {
  if (typeof value === "string") {
    const text = value.trim();
    return INVALID_ANALYSIS_PATTERNS.some((pattern) => pattern.test(text));
  }

  if (Array.isArray(value)) {
    return value.some(containsInvalidAnalysisText);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(containsInvalidAnalysisText);
  }

  return false;
}

export function hasValidMarketDataPayload(rawData: string): boolean {
  const trimmed = rawData.trim();

  if (!trimmed) return false;
  if (INVALID_SOURCE_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;

  return (
    trimmed.includes("--- Timeframe:") &&
    /EMA_8:/i.test(trimmed) &&
    /RSI:/i.test(trimmed) &&
    /MACD:/i.test(trimmed) &&
    /ATR:/i.test(trimmed)
  );
}

export function isUsableAnalysis(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;

  const analysis = value as Partial<AnalysisResult>;

  if (!["BUY", "SELL", "WAIT"].includes(String(analysis.recommendation))) return false;
  if (containsInvalidAnalysisText(value)) return false;
  if (typeof analysis.marketOverview?.summary !== "string" || !analysis.marketOverview.summary.trim()) return false;
  if (!Array.isArray(analysis.marketOverview?.timeframes) || analysis.marketOverview.timeframes.length === 0) return false;

  return true;
}