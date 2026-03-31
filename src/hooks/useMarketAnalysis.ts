import { useState, useEffect, useCallback, useRef } from "react";
import { parseMarketData, type TimeframeData } from "@/lib/parseData";
import type { AnalysisResult } from "@/types/analysis";
import { supabase } from "@/integrations/supabase/client";
import { hasValidMarketDataPayload, isUsableAnalysis } from "@/lib/analysisValidation";
import { getNextAnalysisTime, isAnalysisCurrentForActiveSlot } from "@/lib/analysisCycle";

export function useMarketAnalysis() {
  const [marketData, setMarketData] = useState<TimeframeData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [nextAnalysis, setNextAnalysis] = useState<Date | null>(null);
  const [rawData, setRawData] = useState<string>("");
  const lastTriggeredSlotRef = useRef<string | null>(null);
  const recoveryRunStartedRef = useRef(false);

  // Fetch local market data file (updates every minute from platform)
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/data/XAUUSDm_Complete_Data.txt?t=" + Date.now());
      const text = await res.text();
      if (!hasValidMarketDataPayload(text)) {
        console.error("Market data source returned invalid content");
        return;
      }
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
        .limit(20);

      if (dbError) {
        if (dbError.code === "PGRST116") {
          setError("No analysis available yet. Waiting for the first 5-minute analysis...");
          setLoading(false);
          return;
        }
        throw dbError;
      }

      const latestValid = data?.find((row) => {
        if (!isUsableAnalysis(row.analysis)) return false;
        return isAnalysisCurrentForActiveSlot(new Date(row.created_at));
      });

      if (latestValid) {
        const validAnalysis = latestValid.analysis as unknown as AnalysisResult;
        setAnalysis(validAnalysis);
        setLastUpdate(new Date(latestValid.created_at));
        setError(null);
      } else if (!data?.length) {
        setError("No analysis available yet. Waiting for the first 5-minute analysis...");
      } else {
        setAnalysis(null);
        setLastUpdate(null);
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
    setNextAnalysis(getNextAnalysisTime());
  }, []);

  // Initial load: fetch data + load latest analysis from DB
  useEffect(() => {
    fetchData();
    loadLatestAnalysis();
    updateNextAnalysis();
  }, [fetchData, loadLatestAnalysis, updateNextAnalysis]);

  // Refresh local data every 1 second (prices & indicators live)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();

      if (!nextAnalysis) {
        setAnalyzing(false);
        return;
      }

      const diff = nextAnalysis.getTime() - Date.now();
      setAnalyzing(diff <= 10000 && diff > 0);

      if (diff <= 0 && hasValidMarketDataPayload(rawData)) {
        const slotKey = nextAnalysis.toISOString();
        if (lastTriggeredSlotRef.current !== slotKey) {
          lastTriggeredSlotRef.current = slotKey;
          void runAnalysis(rawData);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchData, nextAnalysis, rawData]);

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
          if (!isUsableAnalysis(newRow.analysis)) {
            console.warn("Ignoring invalid analysis payload from realtime update");
            return;
          }

          const validAnalysis = newRow.analysis as unknown as AnalysisResult;
          setAnalysis(validAnalysis);
          setLastUpdate(new Date(newRow.created_at));
          setError(null);
          setLoading(false);
          setAnalyzing(false);
          updateNextAnalysis();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [updateNextAnalysis]);

  const runAnalysis = useCallback(async (providedRawData?: string) => {
    setLoading(true);
    setAnalysis(null);
    setLastUpdate(null);
    setError(null);
    setRunningAnalysis(true);

    try {
      let text = providedRawData && hasValidMarketDataPayload(providedRawData) ? providedRawData : rawData;

      if (!hasValidMarketDataPayload(text)) {
        const res = await fetch("/data/XAUUSDm_Complete_Data.txt?t=" + Date.now());
        text = await res.text();
      }

      if (!hasValidMarketDataPayload(text)) {
        throw new Error("Invalid market data payload");
      }

      const { buildAnalysisPrompt } = await import("@/lib/analysisPrompt");
      const prompt = buildAnalysisPrompt(text);
      const { data: result, error: fnError } = await supabase.functions.invoke("analyze-gold", {
        body: { prompt, rawData: text },
      });

      if (fnError) throw fnError;
      if (result?.rate_limited) {
        console.warn("Rate limited by AI, will retry next cycle");
        setError("We'll be back shortly");
        setLoading(false);
        setRunningAnalysis(false);
        setAnalyzing(false);
        updateNextAnalysis();
        return;
      }
      if (result?.error) {
        console.warn("Analysis soft error:", result.error);
        setError("We'll be back shortly");
        setLoading(false);
        setRunningAnalysis(false);
        setAnalyzing(false);
        updateNextAnalysis();
        return;
      }

      if (isUsableAnalysis(result)) {
        setAnalysis(result);
        setLastUpdate(new Date());
        setError(null);
        setLoading(false);
        setAnalyzing(false);
        updateNextAnalysis();
        return;
      }

      console.warn("Analysis returned unusable payload");
      setError("We'll be back shortly");
      setLoading(false);
      setAnalyzing(false);
      updateNextAnalysis();
    } catch (err) {
      console.error("Analysis error:", err);
      setError("We'll be back shortly");
      setLoading(false);
      setAnalyzing(false);
      updateNextAnalysis();
    } finally {
      setRunningAnalysis(false);
    }
  }, [rawData, updateNextAnalysis]);

  useEffect(() => {
    if (loading || analysis || !hasValidMarketDataPayload(rawData) || recoveryRunStartedRef.current) {
      return;
    }

    recoveryRunStartedRef.current = true;
    void runAnalysis(rawData);
  }, [analysis, loading, rawData, runAnalysis]);

  return {
    marketData,
    analysis,
    loading,
    lastUpdate,
    error,
    rawData,
    analyzing,
    runningAnalysis,
    nextAnalysis,
    runAnalysis,
  };
}
