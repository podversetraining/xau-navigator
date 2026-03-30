import type { AnalysisResult } from "@/types/analysis";
import type { TimeframeData } from "@/lib/parseData";

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && !isNaN(v) && v > 0;
}

function isValidStr(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const lower = v.toLowerCase().trim();
  return lower.length > 0 && !lower.includes("invalid") && !lower.includes("unknown") && !lower.includes("cannot determine") && !lower.includes("no market data") && !lower.includes("html") && !lower.includes("authentication") && lower !== "—" && lower !== "-";
}

function parseMarketTimestamp(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function getMarketTiming(data: TimeframeData[], analysis: AnalysisResult) {
  const source =
    data.find((item) => item.timeframe.includes("M1")) ??
    data[data.length - 1] ??
    data.find((item) => isValidStr(item.time));

  const rawTimestamp = source?.time || source?.currentCandle?.time || source?.lastCandle?.time || (isValidStr(analysis.timing?.dataTime) ? analysis.timing.dataTime : "");
  const parsedTimestamp = isValidStr(rawTimestamp) ? parseMarketTimestamp(rawTimestamp) : null;
  // Server time is GMT+0 — convert to Dubai Time (UTC+4) for session display
  const gmtHour = parsedTimestamp?.getHours() ?? -1;
  const dubaiHour = gmtHour >= 0 ? (gmtHour + 4) % 24 : -1;
  const day = parsedTimestamp?.getDay() ?? -1;

  // Sessions in Dubai Time (UTC+3)
  const sessions = {
    sydney: dubaiHour >= 1 && dubaiHour < 9,
    tokyo: dubaiHour >= 4 && dubaiHour < 12,
    london: dubaiHour >= 10 && dubaiHour < 19,
    newYork: dubaiHour >= 15 && dubaiHour < 24,
  };

  const marketStatus = day === 0 || day === 6
    ? "Weekend / limited market activity"
    : sessions.london && sessions.newYork
      ? "High-liquidity overlap session"
      : sessions.london
        ? "London session active"
        : sessions.newYork
          ? "New York session active"
          : sessions.tokyo
            ? "Asian session active"
            : isValidStr(rawTimestamp)
              ? "Live market data feed"
              : isValidStr(analysis.timing?.marketStatus)
                ? analysis.timing.marketStatus
                : "";

  const bestTradingWindow = day === 0 || day === 6
    ? "Wait for weekday market reopening"
    : sessions.london && sessions.newYork
      ? "London & New York overlap — optimal liquidity now"
      : sessions.london
        ? "London session active — strongest move often comes near New York open"
        : sessions.newYork
          ? "New York session active — momentum and continuation setups favored"
          : sessions.tokyo
            ? "Asian session — wait for London for stronger gold liquidity"
            : isValidStr(rawTimestamp)
              ? "Monitor until London open for better execution quality"
              : isValidStr(analysis.timing?.bestTradingTime)
                ? analysis.timing.bestTradingTime
                : "";

  return {
    timestampText: isValidStr(rawTimestamp) ? `${rawTimestamp} GMT → ${dubaiHour >= 0 ? String(dubaiHour).padStart(2, "0") + ":" + String(parsedTimestamp!.getMinutes()).padStart(2, "0") + " Dubai Time" : ""}` : "",
    marketStatus,
    bestTradingWindow,
    sessions,
  };
}

export function SlideTimingRisk({ analysis, data }: { analysis: AnalysisResult; data: TimeframeData[] }) {
  const isWait = analysis.recommendation === "WAIT";
  const timing = getMarketTiming(data, analysis);

  return (
    <div className="h-full flex flex-col gap-6 p-8">
      <h2 className="font-display text-lg tracking-widest text-dim">TIMING & RISK MANAGEMENT</h2>

      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="glass-panel rounded-lg p-6 gold-border-glow">
          <h3 className="font-display text-sm tracking-widest text-gold mb-4">⏰ MARKET TIMING</h3>
          <div className="flex flex-col gap-4">
            {isValidStr(timing.timestampText) && (
              <InfoBlock label="Data Timestamp" value={timing.timestampText} />
            )}
            {isValidStr(timing.marketStatus) && (
              <InfoBlock label="Market Status" value={timing.marketStatus} />
            )}
            {isValidStr(timing.bestTradingWindow) && (
              <InfoBlock label="Best Trading Window" value={timing.bestTradingWindow} />
            )}

            <div className="bg-secondary rounded-lg p-4 mt-2">
              <h4 className="text-xs text-gold font-display tracking-widest mb-2">TRADING SESSIONS (DUBAI TIME)</h4>
              <div className="flex flex-col gap-2 text-sm font-data">
                <SessionRow name="Sydney" time="01:00 - 09:00" active={timing.sessions.sydney} />
                <SessionRow name="Tokyo" time="04:00 - 12:00" active={timing.sessions.tokyo} />
                <SessionRow name="London" time="10:00 - 19:00" active={timing.sessions.london} />
                <SessionRow name="New York" time="15:00 - 00:00" active={timing.sessions.newYork} />
              </div>
            </div>
          </div>
        </div>

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
