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
import { Radio } from "lucide-react";

const SLIDE_DURATION = 15000;

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
  { id: "company", label: "ABOUT US" },
];

export function TradingDashboard() {
  const { marketData, analysis, loading, lastUpdate, error } = useMarketAnalysis();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

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

  useEffect(() => {
    setProgress(0);
  }, [currentSlide]);

  const price = marketData[0]?.currentPrice || 0;
  const time = marketData[0]?.time || "";

  if (!analysis && !loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background trading-grid-bg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center animate-glow-pulse">
            <Radio className="w-7 h-7 text-gold" />
          </div>
          <h1 className="font-display text-2xl gold-gradient-text mb-3">ARAB GLOBAL SECURITIES</h1>
          <p className="text-dim font-display text-xs tracking-[0.3em]">INITIALIZING TRADING SYSTEM</p>
          {error && <p className="text-bearish mt-4 text-sm font-data">{error}</p>}
        </motion.div>
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="h-screen flex items-center justify-center bg-background trading-grid-bg">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            >
              <Radio className="w-7 h-7 text-gold" />
            </motion.div>
          </div>
          <h1 className="font-display text-2xl gold-gradient-text mb-3">ARAB GLOBAL SECURITIES</h1>
          <div className="flex items-center gap-3 justify-center mb-2">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-gold"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                />
              ))}
            </div>
            <p className="text-foreground font-body text-base">Analyzing 7 timeframes with 90+ indicators</p>
          </div>
          <p className="text-dim text-xs font-display tracking-[0.2em]">AI QUANTITATIVE ANALYSIS IN PROGRESS</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden trading-grid-bg scanline-overlay">
      <DashboardHeader price={price} time={time} loading={loading} />

      {/* Slide Navigation */}
      <div className="flex items-center px-6 py-2 border-b border-border gap-0.5 bg-card/30">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlide(i)}
            className={`relative px-3 py-1.5 rounded text-[10px] font-display tracking-wider transition-all duration-300 ${
              i === currentSlide
                ? "text-gold"
                : "text-dim hover:text-foreground"
            }`}
          >
            {i === currentSlide && (
              <motion.div
                layoutId="activeSlideTab"
                className="absolute inset-0 bg-gold/10 border border-gold/25 rounded"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{slide.label}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4">
          {lastUpdate && (
            <span className="text-dim text-[10px] font-data">
              Analysis: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <span className="text-dim text-[10px] font-data tabular-nums">
            Next: {Math.ceil((SLIDE_DURATION - (progress / 100 * SLIDE_DURATION)) / 1000)}s
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-[2px] bg-secondary/50 relative">
        <motion.div
          className="h-full bg-gradient-to-r from-gold/60 via-gold to-gold/60"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
        <motion.div
          className="absolute top-0 h-full w-16 bg-gradient-to-r from-transparent via-gold/40 to-transparent"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      {/* Slide Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 15, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.995 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
          >
            {analysis && renderSlide(currentSlide, analysis, marketData)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-8 py-2 border-t border-border flex items-center justify-between bg-card/30">
        <span className="text-dim text-[10px] font-display tracking-[0.15em]">
          ARAB GLOBAL SECURITIES — AI QUANTITATIVE ANALYSIS DESK
        </span>
        <div className="flex items-center gap-6">
          <span className="text-dim text-[10px] font-data tabular-nums">
            {SLIDES[currentSlide].label} • {currentSlide + 1}/{SLIDES.length}
          </span>
          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-gold"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span className="text-gold text-[10px] font-display tracking-[0.2em]">LIVE BROADCAST</span>
          </div>
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
    case 9: return <SlideCompanyInfo />;
    default: return null;
  }
}
