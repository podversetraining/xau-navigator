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

const SLIDE_DURATION = 15000; // 15 seconds per slide

const SLIDES = [
  { id: "overview", label: "OVERVIEW" },
  { id: "trend", label: "TREND" },
  { id: "momentum", label: "MOMENTUM" },
  { id: "entry", label: "ENTRY" },
  { id: "trade", label: "TRADE SETUP" },
  { id: "fibonacci", label: "FIBONACCI" },
  { id: "ichimoku", label: "ICHIMOKU" },
  { id: "matrix", label: "MATRIX" },
  { id: "timing", label: "TIMING" },
];

export function TradingDashboard() {
  const { marketData, analysis, loading, lastUpdate, error } = useMarketAnalysis();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

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
              Last analysis: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <span className="text-dim text-xs font-data">
            Next in {Math.ceil((SLIDE_DURATION - (progress / 100 * SLIDE_DURATION)) / 1000)}s
          </span>
        </div>
      </div>

      {/* Progress Bar */}
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
            {analysis && renderSlide(currentSlide, analysis, marketData)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-8 py-2 border-t border-border flex items-center justify-between">
        <span className="text-dim text-xs font-data">
          ARAB GLOBAL SECURITIES — Institutional Trading Desk • XAUUSD Analysis System
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
    case 1: return <SlideTrendAnalysis analysis={analysis} data={data} />;
    case 2: return <SlideMomentum analysis={analysis} data={data} />;
    case 3: return <SlideEntryPoint analysis={analysis} data={data} />;
    case 4: return <SlideTradeSetup analysis={analysis} />;
    case 5: return <SlideFibonacci data={data} />;
    case 6: return <SlideIchimoku data={data} />;
    case 7: return <SlideMultiTimeframe data={data} />;
    case 8: return <SlideTimingRisk analysis={analysis} />;
    default: return null;
  }
}
