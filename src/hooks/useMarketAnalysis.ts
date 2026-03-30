import { useState, useEffect, useCallback } from "react";
import { parseMarketData, type TimeframeData } from "@/lib/parseData";
import type { AnalysisResult } from "@/types/analysis";
import { supabase } from "@/integrations/supabase/client";

export function useMarketAnalysis() {
  const [marketData, setMarketData] = useState<TimeframeData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [nextAnalysis, setNextAnalysis] = useState<Date | null>(null);
  const [rawData, setRawData] = useState<string>("");

  // Fetch local market data file (updates every minute from platform)
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/data/XAUUSDm_Complete_Data.txt?t=" + Date.now());
      const text = await res.text();
      setRawData(text);
      const parsed = parseMarketData(text);
      setMarketData(parsed);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, []);

  // Load latest analysis from database
  const loadLatestAnalysis = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from("gold_analysis")
        .select("analysis, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (dbError) {
        if (dbError.code === "PGRST116") {
          // No rows yet - first time, no analysis available
          setError("No analysis available yet. Waiting for the first hourly analysis...");
          setLoading(false);
          return;
        }
        throw dbError;
      }

      if (data) {
        setAnalysis(data.analysis as unknown as AnalysisResult);
        setLastUpdate(new Date(data.created_at));
        setError(null);
      }
    } catch (err) {
      console.error("Failed to load analysis:", err);
      setError("Failed to load analysis from database");
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate next analysis time (next 5-min mark)
  const updateNextAnalysis = useCallback(() => {
    const now = new Date();
    const next = new Date(now);
    const mins = now.getMinutes();
    const nextMin = Math.ceil((mins + 1) / 5) * 5;
    next.setMinutes(nextMin, 0, 0);
    if (next <= now) next.setMinutes(next.getMinutes() + 5);
    setNextAnalysis(next);
  }, []);

  // Initial load: fetch data + load latest analysis from DB
  useEffect(() => {
    fetchData();
    loadLatestAnalysis();
    updateNextAnalysis();
  }, [fetchData, loadLatestAnalysis, updateNextAnalysis]);

  // Refresh local data every minute + update countdown
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
      // Show "analyzing" indicator ~10s before next analysis
      if (nextAnalysis) {
        const diff = nextAnalysis.getTime() - Date.now();
        if (diff <= 10000 && diff > -30000) {
          setAnalyzing(true);
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData, nextAnalysis]);

  // Subscribe to realtime updates on gold_analysis table
  useEffect(() => {
    const channel = supabase
      .channel("gold-analysis-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gold_analysis",
        },
        (payload) => {
          const newRow = payload.new as { analysis: unknown; created_at: string };
          setAnalysis(newRow.analysis as AnalysisResult);
          setLastUpdate(new Date(newRow.created_at));
          setError(null);
          setLoading(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    marketData,
    analysis,
    loading,
    lastUpdate,
    error,
    rawData,
    runAnalysis: async () => {
      // Manual trigger kept for admin use
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/data/XAUUSDm_Complete_Data.txt?t=" + Date.now());
        const text = await res.text();
        const { buildAnalysisPrompt } = await import("@/lib/analysisPrompt");
        const prompt = buildAnalysisPrompt(text);
        const { data: result, error: fnError } = await supabase.functions.invoke("analyze-gold", {
          body: { prompt },
        });
        if (fnError) throw fnError;
        if (result?.error) setError(result.error);
        // Result will arrive via realtime subscription
      } catch (err) {
        console.error("Manual analysis error:", err);
        setError("Analysis failed");
        setLoading(false);
      }
    },
  };
}
