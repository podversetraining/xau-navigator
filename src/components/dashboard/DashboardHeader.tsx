import { motion } from "framer-motion";

export function DashboardHeader({ price, time, loading }: { price: number; time: string; loading: boolean }) {
  return (
    <div className="flex items-center justify-between px-8 py-4 border-b border-border">
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="font-display text-xl tracking-wider gold-gradient-text font-bold">
            ARAB GLOBAL SECURITIES
          </span>
          <span className="text-dim text-sm font-body tracking-widest">
            INSTITUTIONAL TRADING DESK
          </span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <span className="text-dim text-sm font-data uppercase">XAU/USD</span>
          <motion.span
            key={price}
            initial={{ scale: 1.1, color: "hsl(43 96% 70%)" }}
            animate={{ scale: 1, color: "hsl(43 96% 56%)" }}
            className="font-display text-3xl font-bold text-gold"
          >
            {price.toFixed(2)}
          </motion.span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-dim text-xs font-data">{time}</span>
          <div className="flex items-center gap-2">
            {loading ? (
              <span className="text-primary text-xs animate-pulse">ANALYZING...</span>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-bullish animate-pulse-gold" />
                <span className="text-bullish text-xs font-data">LIVE</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
