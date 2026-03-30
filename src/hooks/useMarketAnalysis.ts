import { useState, useEffect, useCallback } from "react";
import { parseMarketData, type TimeframeData } from "@/lib/parseData";
import { buildAnalysisPrompt } from "@/lib/analysisPrompt";
import type { AnalysisResult } from "@/types/analysis";
import { supabase } from "@/integrations/supabase/client";

export function useMarketAnalysis() {
  const [marketData, setMarketData] = useState<TimeframeData[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/data/XAUUSDm_Complete_Data.txt?t=" + Date.now());
      const text = await res.text();
      setRawData(text);
      const parsed = parseMarketData(text);
      setMarketData(parsed);
      return text;
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to fetch market data");
      return null;
    }
  }, []);

  const runAnalysis = useCallback(async (data: string) => {
    setLoading(true);
    setError(null);
    try {
      const prompt = buildAnalysisPrompt(data);
      const { data: result, error: fnError } = await supabase.functions.invoke("analyze-gold", {
        body: { prompt },
      });
      if (fnError) throw fnError;
      if (result && !result.error) {
        setAnalysis(result as AnalysisResult);
        setLastUpdate(new Date());
      } else {
        setError(result?.error || "Analysis failed");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Will retry next cycle.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const data = await fetchData();
      if (data) await runAnalysis(data);
    };
    init();
  }, [fetchData, runAnalysis]);

  // Fetch data every minute (file updates from platform)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Run analysis every hour
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchData();
      if (data) await runAnalysis(data);
    }, 3600000);
    return () => clearInterval(interval);
  }, [fetchData, runAnalysis]);

  return { marketData, analysis, loading, lastUpdate, error, rawData, runAnalysis: () => fetchData().then(d => d && runAnalysis(d)) };
}
