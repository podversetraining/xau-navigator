import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMarketAnalysis } from "@/hooks/useMarketAnalysis";
import { DashboardHeader } from "./DashboardHeader";
import { SlideOverview } from "./SlideOverview";
import { SlideTrendAnalysis } from "./SlideTrendAnalysis";
import { SlideMomentum } from "./SlideMomentum";
import { SlideEntryPoint } from "./SlideEntryPoint";
import { SlideTradeSetup } from "./SlideTradeSetup";
import { SlideFibonacci } from "./SlideFibonacci";
import { SlideIchimoku } from "./SlideIchimoku";
import { SlideMultiTimeframe } from "./SlideMultiTimeframe";
import { SlideTimingRisk } from "./SlideTimingRisk";
import { SlideCompanyInfo } from "./SlideCompanyInfo";
import { SlideMarketOverview } from "./SlideMarketOverview";

const SLIDE_DURATION = 15000; // 15 seconds per slide

const SLIDES = [
  { id: "overview", label: "OVERVIEW" },
  { id: "market", label: "MARKET" },
  { id: "trend", label: "TREND" },
  { id: "momentum", label: "MOMENTUM" },
  { id: "entry", label: "ENTRY" },
  { id: "trade", label: "TRADE SETUP" },
  { id: "fibonacci", label: "FIBONACCI" },
  { id: "ichimoku", label: "ICHIMOKU" },
  { id: "matrix", label: "MATRIX" },
  { id: "timing", label: "TIMING" },
  { id: "company", label: "ABOUT US" },
];

export function TradingDashboard() {
  const { marketData, analysis, loading, lastUpdate, error, analyzing, nextAnalysis } = useMarketAnalysis();
  const [countdown, setCountdown] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  // Holds the confirmed analysis to display — only swapped atomically after update completes
  const [displayAnalysis, setDisplayAnalysis] = useState(analysis);
  const [analysisVersionAtStart, setAnalysisVersionAtStart] = useState<string | null>(null);

  // Countdown to next analysis
  useEffect(() => {
    if (!nextAnalysis) return;
    const timer = setInterval(() => {
      const diff = Math.max(0, nextAnalysis.getTime() - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [nextAnalysis]);

  // When analysis starts: show update screen, reset slides
  useEffect(() => {
    if (analyzing) {
      setShowAnalyzing(true);
      setAnalyzeProgress(0);
      // Remember the current analysis timestamp so we know when a NEW one arrives
      setAnalysisVersionAtStart(lastUpdate?.toISOString() || "none");
    }
  }, [analyzing, lastUpdate]);

  // When analysis finishes: wait for NEW analysis data, then swap atomically and reveal
  useEffect(() => {
    if (!analyzing && showAnalyzing && analysis) {
      const currentVersion = lastUpdate?.toISOString() || "none";
      const hasNewData = currentVersion !== analysisVersionAtStart;

      if (hasNewData) {
        // New analysis arrived — show 100%, swap data atomically, then reveal
        setAnalyzeProgress(100);
        const timer = setTimeout(() => {
          setDisplayAnalysis(analysis); // Atomic swap
          setCurrentSlide(0);
          setProgress(0);
          setShowAnalyzing(false);
          setAnalyzeProgress(0);
        }, 2500);
        return () => clearTimeout(timer);
      }

      // No new data yet but analyzing stopped (e.g. rate limit) — just dismiss
      if (!analyzing) {
        const fallbackTimer = setTimeout(() => {
          setShowAnalyzing(false);
          setAnalyzeProgress(0);
        }, 1500);
        return () => clearTimeout(fallbackTimer);
      }
    }
  }, [analyzing, showAnalyzing, analysis, lastUpdate, analysisVersionAtStart]);

  // Keep displayAnalysis in sync when NOT in analyzing mode (e.g. initial load)
  useEffect(() => {
    if (!showAnalyzing && analysis) {
      setDisplayAnalysis(analysis);
    }
  }, [analysis, showAnalyzing]);

  // Animate progress while analyzing
  useEffect(() => {
    if (!showAnalyzing || !analyzing) return;
    const interval = setInterval(() => {
      setAnalyzeProgress(prev => {
        if (prev >= 90) return Math.min(prev + 0.1, 92);
        if (prev >= 70) return prev + 0.5;
        if (prev >= 40) return prev + 1;
        return prev + 2;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [showAnalyzing, analyzing]);

  // Auto-advance slides
  useEffect(() => {
    if (!analysis) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = (elapsed % SLIDE_DURATION) / SLIDE_DURATION * 100;
      setProgress(pct);

      if (elapsed % SLIDE_DURATION < 50) {
        setCurrentSlide(prev => (prev + 1) % SLIDES.length);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [analysis, currentSlide]);

  // Reset progress on slide change
  useEffect(() => {
    setProgress(0);
  }, [currentSlide]);

  const price = marketData[0]?.currentPrice || 0;
  const time = marketData[0]?.time || "";

  if (!analysis && !loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-display text-2xl text-gold mb-4">ARAB GLOBAL SECURITIES</h1>
          <p className="text-dim">Initializing trading analysis system...</p>
          {error && <p className="text-bearish mt-2 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-display text-2xl text-gold mb-4">ARAB GLOBAL SECURITIES</h1>
          <div className="flex items-center gap-3 justify-center">
            <div className="w-3 h-3 rounded-full bg-gold animate-pulse" />
            <p className="text-foreground font-body text-lg">Analyzing 7 timeframes with 90+ indicators...</p>
          </div>
          <p className="text-dim text-sm mt-2">AI quantitative analysis in progress</p>
        </div>
      </div>
    );
  }

  // Full-screen analysis update screen
  if (showAnalyzing) {
    const phase = analyzeProgress >= 100
      ? "ANALYSIS COMPLETE ✓"
      : analyzeProgress >= 80
        ? "Finalizing recommendation..."
        : analyzeProgress >= 60
          ? "Calculating entry points & risk levels..."
          : analyzeProgress >= 40
            ? "Processing momentum & timing signals..."
            : analyzeProgress >= 20
              ? "Analyzing trend across 7 timeframes..."
              : "Reading market data & indicators...";

    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <DashboardHeader price={price} time={time} loading={true} />
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg mx-auto text-center px-8"
          >
            {/* Pulsing icon */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))", border: "1px solid hsl(var(--primary) / 0.3)" }}
            >
              <span className="text-3xl">
                {analyzeProgress >= 100 ? "✓" : "⚡"}
              </span>
            </motion.div>

            <h2 className="font-display text-xl tracking-widest text-gold mb-2">
              {analyzeProgress >= 100 ? "UPDATE COMPLETE" : "UPDATING ANALYSIS"}
            </h2>
            <p className="text-muted-foreground text-sm font-body mb-8">{phase}</p>

            {/* Progress bar */}
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${Math.max(0, Math.min(100, analyzeProgress))}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{
                  background: analyzeProgress >= 100
                    ? "linear-gradient(90deg, hsl(var(--success)), hsl(142 72% 55%))"
                    : "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)))",
                  boxShadow: analyzeProgress >= 100
                    ? "0 0 20px hsl(var(--success) / 0.5)"
                    : "0 0 16px hsl(var(--primary) / 0.4)",
                }}
              />
            </div>
            <span className="text-gold font-display text-lg tracking-wider">
              {Math.round(analyzeProgress)}%
            </span>

            {/* Indicators being analyzed */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { label: "TREND", done: analyzeProgress >= 40 },
                { label: "MOMENTUM", done: analyzeProgress >= 60 },
                { label: "ENTRY", done: analyzeProgress >= 80 },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg px-3 py-2 text-xs font-display tracking-wider transition-all duration-500 ${
                    item.done
                      ? "bg-gold/10 text-gold border border-gold/30"
                      : "bg-secondary text-muted-foreground border border-border"
                  }`}
                >
                  {item.done ? "✓ " : "○ "}{item.label}
                </div>
              ))}
            </div>

            <p className="text-muted-foreground text-xs mt-6 font-data">
              ARAB GLOBAL SECURITIES — AI Quantitative Analysis
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <DashboardHeader price={price} time={time} loading={loading} />

      {/* Slide Navigation */}
      <div className="flex items-center px-8 py-2 border-b border-border gap-1">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlide(i)}
            className={`px-3 py-1.5 rounded text-xs font-display tracking-wider transition-all ${
              i === currentSlide
                ? "bg-gold/20 text-gold border border-gold/30"
                : "text-dim hover:text-foreground"
            }`}
          >
            {slide.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {lastUpdate && (
            <span className="text-dim text-xs font-data">
              Last: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <span className="text-dim text-xs font-data">
            Next analysis: {countdown}
          </span>
          <span className="text-dim text-xs font-data">
            Slide {Math.ceil((SLIDE_DURATION - (progress / 100 * SLIDE_DURATION)) / 1000)}s
          </span>
        </div>
      </div>

      {/* Slide Progress Bar */}
      <div className="h-0.5 bg-secondary relative">
        <motion.div
          className="h-full bg-gold/50"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>

      {/* Slide Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
          {displayAnalysis && renderSlide(currentSlide, displayAnalysis, marketData)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-8 py-2 border-t border-border flex items-center justify-between">
        <span className="text-dim text-xs font-data">
          ARAB GLOBAL SECURITIES — AI Quantitative Analysis Desk • XAUUSD Analysis System
        </span>
        <div className="flex items-center gap-4">
          <span className="text-dim text-xs font-data">
            {SLIDES[currentSlide].label} • Slide {currentSlide + 1}/{SLIDES.length}
          </span>
          <span className="text-gold text-xs font-data animate-pulse-gold">● LIVE BROADCAST</span>
        </div>
      </div>
    </div>
  );
}

function renderSlide(index: number, analysis: any, data: any[]) {
  switch (index) {
    case 0: return <SlideOverview analysis={analysis} data={data} />;
    case 1: return <SlideMarketOverview analysis={analysis} data={data} />;
    case 2: return <SlideTrendAnalysis analysis={analysis} data={data} />;
    case 3: return <SlideMomentum analysis={analysis} data={data} />;
    case 4: return <SlideEntryPoint analysis={analysis} data={data} />;
    case 5: return <SlideTradeSetup analysis={analysis} />;
    case 6: return <SlideFibonacci data={data} />;
    case 7: return <SlideIchimoku data={data} />;
    case 8: return <SlideMultiTimeframe data={data} />;
    case 9: return <SlideTimingRisk analysis={analysis} data={data} />;
    case 10: return <SlideCompanyInfo />;
    default: return null;
  }
}
