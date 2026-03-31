export interface TimeframeSummary {
  timeframe: string;
  trend: "Bullish" | "Bearish" | "Sideways";
  momentum: "Bullish" | "Bearish" | "Neutral";
  strength: number; // 0-100
  keySignal: string;
}

export interface LayerVotes {
  bullish: number;
  bearish: number;
  neutral: number;
}

export interface FiltersApplied {
  volumeConfirmation: "PASS" | "FAIL" | "EXEMPT_SESSION_OPEN";
  trendMomentumAlignment: "PASS" | "FAIL";
  exhaustionGuard: "PASS" | "FAIL";
  bollingerSqueeze: "PASS" | "FAIL" | "N/A";
  counterTrendGuard: "PASS" | "FAIL" | "N/A";
}

export interface AnalysisResult {
  recommendation: "BUY" | "SELL" | "WAIT";
  tradeType: string;
  conviction?: string;
  score: {
    layer1: number;
    layer2: number;
    layer3: number;
    total: number;
    threshold?: number;
    rating: string;
  };
  votes?: {
    layer1: LayerVotes;
    layer2: LayerVotes;
    layer3: LayerVotes;
  };
  filtersApplied?: FiltersApplied;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskReward: number;
  lotSize: number;
  lotCalculation: string;
  marketOverview: {
    overallBias: "Bullish" | "Bearish" | "Neutral";
    summary: string;
    timeframes: TimeframeSummary[];
  };
  layer1Analysis: {
    trend: string;
    strength: number;
    emaOrder: string;
    superTrend: string;
    alligator: string;
    ichimoku: string;
    fibonacci: string;
    summary: string;
  };
  layer2Analysis: {
    momentum: string;
    strength: number;
    rsi: string;
    macd: string;
    stochastic: string;
    smartMoney?: string;
    divergence: string;
    summary: string;
  };
  layer3Analysis: {
    entryZone: string;
    bollinger: string;
    pivotPoints: string;
    volume: string;
    atr: string;
    summary: string;
  };
  management: {
    tp1Action: string;
    tp2Action: string;
    tp3Action: string;
  };
  failureScenario: {
    invalidation: string;
    reverseLevel: string;
    reverseOpportunity: string;
  };
  timing: {
    dataTime: string;
    marketStatus: string;
    bestTradingTime: string;
    sessionContext?: string;
  };
  keyLevels: {
    strongResistance: number[];
    strongSupport: number[];
    dailyPivot: number;
    fibConfluence?: string;
  };
}
