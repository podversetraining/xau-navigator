import { useState, useEffect, useCallback } from "react";
import { parseMarketData, type TimeframeData } from "@/lib/parseData";
import type { AnalysisResult } from "@/types/analysis";
import { supabase } from "@/integrations/supabase/client";
import { hasValidMarketDataPayload } from "@/lib/analysisValidation";

export type BroadcastStatus = "live" | "updating" | "maintenance";

export interface BroadcastState {
  status: BroadcastStatus;
  analysis: AnalysisResult | null;
  error: string | null;
  currentSlide: number;
  slideStartedAt: Date;
  nextUpdateAt: Date | null;
  updatedAt: Date;
}

const INITIAL: BroadcastState = {
  status: "maintenance",
  analysis: null,
  error: null,
  currentSlide: 0,
  slideStartedAt: new Date(),
  nextUpdateAt: null,
  updatedAt: new Date(),
};

function rowToBroadcast(row: Record<string, unknown>): BroadcastState {
  const status = (row.status as BroadcastStatus) || "maintenance";
  return {
    status,
    analysis: status === "live" ? (row.analysis as AnalysisResult | null) : null,
    error: (row.error as string) || null,
    currentSlide: (row.current_slide as number) || 0,
    slideStartedAt: new Date((row.slide_started_at as string) || Date.now()),
    nextUpdateAt: row.next_update_at ? new Date(row.next_update_at as string) : null,
    updatedAt: new Date((row.updated_at as string) || Date.now()),
  };
}

export function useMarketAnalysis() {
  const [marketData, setMarketData] = useState<TimeframeData[]>([]);
  const [broadcast, setBroadcast] = useState<BroadcastState>(INITIAL);
  const [loading, setLoading] = useState(true);

  // Fetch local market data file (live prices)
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("http://88.99.64.228/XAUUSDm_Complete_Data.txt?t=" + Date.now());
      const text = await res.text();
      if (!hasValidMarketDataPayload(text)) return;
      setMarketData(parseMarketData(text));
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, []);

  // Load broadcast state from database
  const loadBroadcast = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("broadcast_state")
        .select("*")
        .eq("id", "global")
        .single();

      if (error) throw error;
      if (data) setBroadcast(rowToBroadcast(data as Record<string, unknown>));
    } catch (err) {
      console.error("Failed to load broadcast state:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
    loadBroadcast();
  }, [fetchData, loadBroadcast]);

  // Refresh prices every second
  useEffect(() => {
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Subscribe to broadcast_state realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("broadcast-state-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_state", filter: "id=eq.global" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setBroadcast(rowToBroadcast(row));
          setLoading(false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    marketData,
    broadcast,
    loading,
  };
}
