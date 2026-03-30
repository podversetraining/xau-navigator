import { motion } from "framer-motion";
import { Activity, TrendingUp } from "lucide-react";

export function DashboardHeader({ price, time, loading }: { price: number; time: string; loading: boolean }) {
  return (
    <div className="relative flex items-center justify-between px-8 py-4 border-b border-border overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-card via-background to-card opacity-80" />
      
      <div className="relative flex items-center gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-gold" />
            </div>
            <div>
              <span className="font-display text-xl tracking-wider gold-gradient-text font-bold">
                ARAB GLOBAL SECURITIES
              </span>
              <span className="text-dim text-[10px] font-display tracking-[0.3em] block">
                AI QUANTITATIVE ANALYSIS DESK
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-dim text-[10px] font-display tracking-widest">XAU/USD</span>
            <span className="text-dim text-[9px] font-data">SPOT GOLD</span>
          </div>
          <div className="h-10 w-px bg-border" />
          <motion.div
            key={price}
            initial={{ scale: 1.05, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-baseline gap-1"
          >
            <span className="font-display text-3xl font-bold gold-gradient-text tracking-tight">
              {price.toFixed(2)}
            </span>
          </motion.div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-dim text-xs font-data">{time}</span>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-gold animate-pulse" />
                <span className="text-gold text-[10px] font-display tracking-wider animate-pulse">ANALYZING</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-bullish animate-glow-pulse" />
                <span className="text-bullish text-[10px] font-display tracking-wider">LIVE</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
