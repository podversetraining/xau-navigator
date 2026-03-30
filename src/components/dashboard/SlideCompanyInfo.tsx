import { motion } from "framer-motion";
import { Shield, Zap, BarChart3, GraduationCap, Globe, Users } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Multi-Regulated Brokerage",
    desc: "FSC Mauritius regulated entity for CFDs with full compliance and transparency.",
  },
  {
    icon: BarChart3,
    title: "100% Transparent Pricing",
    desc: "Real market spreads, deep liquidity providers, and institutional execution.",
  },
  {
    icon: Zap,
    title: "Lightning-Fast Execution",
    desc: "Ultra-low latency order execution with direct market access technology.",
  },
  {
    icon: Globe,
    title: "True Multi-Asset Platform",
    desc: "Trade Forex, Indices, Commodities, Crypto CFDs on a single platform.",
  },
  {
    icon: GraduationCap,
    title: "Expert Analysis & Education",
    desc: "Daily market insights, heatmaps, and professional trading education.",
  },
  {
    icon: Users,
    title: "1,000+ Active Traders",
    desc: "Growing community with 4+ years of proven trading experience.",
  },
];

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function SlideCompanyInfo() {
  return (
    <div className="h-full p-8 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl tracking-wider gold-gradient-text font-bold"
        >
          ARAB GLOBAL SECURITIES
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-foreground font-body text-base mt-2 max-w-2xl mx-auto"
        >
          Built for Traders Who Move Markets
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-dim text-sm mt-1 max-w-xl mx-auto"
        >
          Access rolling spot Forex and CFDs with institutional-grade tools, competitive pricing, and dedicated support.
        </motion.p>
      </div>

      {/* Features Grid */}
      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.1, delayChildren: 0.4 }}
        className="grid grid-cols-3 gap-4 flex-1"
      >
        {features.map((f) => (
          <motion.div
            key={f.title}
            variants={item}
            className="border border-border rounded-lg p-5 bg-card/50 hover:border-gold/30 transition-colors flex flex-col"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-display text-sm tracking-wide text-foreground">{f.title}</h3>
            </div>
            <p className="text-dim text-xs leading-relaxed flex-1">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 text-center flex items-center justify-center gap-6"
      >
        <span className="text-dim text-xs font-data">www.arabglobalsecurities.com</span>
        <span className="text-gold text-xs font-display tracking-wider">START TRADING TODAY</span>
        <span className="text-dim text-xs font-data">Secure • Regulated • Transparent</span>
      </motion.div>
    </div>
  );
}
