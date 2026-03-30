import type { AnalysisResult } from "@/types/analysis";

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && !isNaN(v) && v > 0;
}

function isValidStr(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const lower = v.toLowerCase().trim();
  return lower.length > 0 && !lower.includes("invalid") && !lower.includes("unknown") && !lower.includes("cannot determine") && !lower.includes("no market data") && !lower.includes("html") && !lower.includes("authentication") && lower !== "—" && lower !== "-";
}

export function SlideTimingRisk({ analysis }: { analysis: AnalysisResult }) {
  const isWait = analysis.recommendation === "WAIT";

  return (
    <div className="h-full flex flex-col gap-6 p-8">
      <h2 className="font-display text-lg tracking-widest text-dim">TIMING & RISK MANAGEMENT</h2>

      <div className="grid grid-cols-2 gap-6 flex-1">
        {/* Timing */}
        <div className="glass-panel rounded-lg p-6 gold-border-glow">
          <h3 className="font-display text-sm tracking-widest text-gold mb-4">⏰ MARKET TIMING</h3>
          <div className="flex flex-col gap-4">
            {isValidStr(analysis.timing?.dataTime) && (
              <InfoBlock label="Data Timestamp" value={analysis.timing.dataTime} />
            )}
            {isValidStr(analysis.timing?.marketStatus) && (
              <InfoBlock label="Market Status" value={analysis.timing.marketStatus} />
            )}
            <InfoBlock
              label="Best Trading Window"
              value={isValidStr(analysis.timing?.bestTradingTime) ? analysis.timing.bestTradingTime : "London & NY overlap (15:00-19:00 Gulf Time)"}
            />

            <div className="bg-secondary rounded-lg p-4 mt-2">
              <h4 className="text-xs text-gold font-display tracking-widest mb-2">TRADING SESSIONS (GULF TIME)</h4>
              <div className="flex flex-col gap-2 text-sm font-data">
                <SessionRow name="Sydney" time="01:00 - 09:00" active={false} />
                <SessionRow name="Tokyo" time="04:00 - 12:00" active={false} />
                <SessionRow name="London" time="10:00 - 19:00" active />
                <SessionRow name="New York" time="15:00 - 00:00" active />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-lg p-6 gold-border-glow">
            <h3 className="font-display text-sm tracking-widest text-gold mb-4">💼 POSITION SIZING</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Account Capital" value="$1,000" />
              <StatBox label="Risk Per Trade" value="2% ($20)" />
              <StatBox label="Lot Size" value="0.01" />
              {isValidNumber(analysis.riskReward) && (
                <StatBox label="Risk/Reward" value={`1:${analysis.riskReward.toFixed(1)}`} />
              )}
            </div>
            <p className="text-xs text-dim font-data mt-3">Fixed rule: 0.01 lot per $1,000 account balance</p>
          </div>

          {!isWait && (isValidStr(analysis.failureScenario?.invalidation) || isValidStr(analysis.failureScenario?.reverseLevel) || isValidStr(analysis.failureScenario?.reverseOpportunity)) && (
            <div className="glass-panel rounded-lg p-6 gold-border-glow flex-1">
              <h3 className="font-display text-sm tracking-widest text-bearish mb-4">⚠ INVALIDATION SCENARIOS</h3>
              <div className="flex flex-col gap-3">
                {isValidStr(analysis.failureScenario?.invalidation) && (
                  <div className="bg-bearish/5 border border-bearish/20 rounded-lg p-3">
                    <span className="text-dim text-xs font-data block">What Invalidates This Analysis?</span>
                    <span className="text-foreground text-sm font-data">{analysis.failureScenario.invalidation}</span>
                  </div>
                )}
                {isValidStr(analysis.failureScenario?.reverseLevel) && (
                  <div className="bg-bearish/5 border border-bearish/20 rounded-lg p-3">
                    <span className="text-dim text-xs font-data block">Reversal Level</span>
                    <span className="text-foreground text-sm font-data">{analysis.failureScenario.reverseLevel}</span>
                  </div>
                )}
                {isValidStr(analysis.failureScenario?.reverseOpportunity) && (
                  <div className="bg-gold/5 border border-gold/20 rounded-lg p-3">
                    <span className="text-dim text-xs font-data block">Reverse Trade Opportunity</span>
                    <span className="text-foreground text-sm font-data">{analysis.failureScenario.reverseOpportunity}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isWait && (
            <div className="glass-panel rounded-lg p-6 gold-border-glow flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="text-gold font-display text-lg tracking-widest">AWAITING SIGNAL</span>
                <p className="text-dim text-sm font-data mt-2">No active trade setup — monitoring market conditions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-dim text-xs font-data block">{label}</span>
      <span className="text-foreground text-sm font-data font-semibold">{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-md p-3 text-center">
      <span className="text-dim text-xs font-data block">{label}</span>
      <span className="text-gold font-display text-lg font-bold">{value}</span>
    </div>
  );
}

function SessionRow({ name, time, active }: { name: string; time: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${active ? "bg-bullish animate-pulse-gold" : "bg-muted"}`} />
        <span className={active ? "text-foreground font-semibold" : "text-dim"}>{name}</span>
      </div>
      <span className="text-dim">{time}</span>
    </div>
  );
}
