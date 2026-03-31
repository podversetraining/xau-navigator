import { useState, useEffect } from "react";
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

const SLIDE_DURATION = 15000;

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
  const { marketData, broadcast, loading } = useMarketAnalysis();
  const [countdown, setCountdown] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  const { status, analysis, error, nextUpdateAt, slideStartedAt, updatedAt } = broadcast;


  // Countdown to next update
  useEffect(() => {
    const calcCountdown = () => {
      let target = nextUpdateAt ? nextUpdateAt.getTime() : 0;
      const now = Date.now();
      // If target is in the past or not set, compute next slot dynamically
      if (!target || target <= now) {
        const d = new Date();
        const min = d.getMinutes();
        const slots = [1, 16, 31, 46];
        const nextSlot = slots.find(s => s > min) ?? slots[0];
        const nxt = new Date(d);
        if (nextSlot <= min) nxt.setHours(nxt.getHours() + 1);
        nxt.setMinutes(nextSlot, 0, 0);
        nxt.setSeconds(0, 0);
        target = nxt.getTime();
      }
      const diff = Math.max(0, target - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    };
    calcCountdown();
    const timer = setInterval(calcCountdown, 1000);
    return () => clearInterval(timer);
  }, [nextUpdateAt]);

  // Reset progress when entering updating state
  useEffect(() => {
    if (status === "updating") setAnalyzeProgress(0);
  }, [status]);

  // Animate progress while updating
  useEffect(() => {
    if (status !== "updating") return;
    const interval = setInterval(() => {
      setAnalyzeProgress(prev => {
        if (prev >= 90) return Math.min(prev + 0.1, 92);
        if (prev >= 70) return prev + 0.5;
        if (prev >= 40) return prev + 1;
        return prev + 2;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [status]);

  // Auto-advance slides — synchronized from server slideStartedAt
  useEffect(() => {
    if (status !== "live" || !analysis) return;
    const startTime = slideStartedAt.getTime();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const slideIndex = Math.floor(elapsed / SLIDE_DURATION) % SLIDES.length;
      const pct = ((elapsed % SLIDE_DURATION) / SLIDE_DURATION) * 100;
      setCurrentSlide(slideIndex);
      setProgress(pct);
    }, 50);
    return () => clearInterval(interval);
  }, [status, analysis, slideStartedAt]);

  const price = marketData[0]?.currentPrice || 0;
  const time = marketData[0]?.time || "";

  // UPDATING — show full-screen progress
  if (status === "updating") {
    const phase = analyzeProgress >= 80
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
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))", border: "1px solid hsl(var(--primary) / 0.3)" }}
            >
              <span className="text-3xl">⚡</span>
            </motion.div>
            <h2 className="font-display text-xl tracking-widest text-gold mb-2">UPDATING ANALYSIS</h2>
            <p className="text-muted-foreground text-sm font-body mb-8">{phase}</p>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden mb-3">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${Math.max(0, Math.min(100, analyzeProgress))}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ background: "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)))", boxShadow: "0 0 16px hsl(var(--primary) / 0.4)" }}
              />
            </div>
            <span className="text-gold font-display text-lg tracking-wider">{Math.round(analyzeProgress)}%</span>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { label: "TREND", done: analyzeProgress >= 40 },
                { label: "MOMENTUM", done: analyzeProgress >= 60 },
                { label: "ENTRY", done: analyzeProgress >= 80 },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg px-3 py-2 text-xs font-display tracking-wider transition-all duration-500 ${item.done ? "bg-gold/10 text-gold border border-gold/30" : "bg-secondary text-muted-foreground border border-border"}`}>
                  {item.done ? "✓ " : "○ "}{item.label}
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs mt-6 font-data">ARAB GLOBAL SECURITIES — AI Quantitative Analysis</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // MAINTENANCE / error / no analysis / loading — "We'll Be Back Shortly"
  if (status === "maintenance" || error || !analysis || loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center px-8"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))", border: "1px solid hsl(var(--primary) / 0.25)" }}
            >
              <span className="text-4xl">⏳</span>
            </motion.div>
            <h1 className="font-display text-3xl text-primary mb-4">ARAB GLOBAL SECURITIES</h1>
            <p className="text-foreground font-body text-xl mb-2">We'll Be Back Shortly</p>
            <p className="text-muted-foreground text-sm mb-6">Updating analysis — we never display stale data to protect your capital</p>
            {nextUpdateAt && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-muted-foreground text-sm font-mono">Next update: {countdown}</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // LIVE — show dashboard with synced slides
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <DashboardHeader price={price} time={time} loading={false} />

      {/* Slide Navigation */}
      <div className="flex items-center px-8 py-2 border-b border-border gap-1">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
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
          <span className="text-dim text-xs font-data">
            Last: {updatedAt.toLocaleTimeString()}
          </span>
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
            {renderSlide(currentSlide, analysis, marketData)}
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
