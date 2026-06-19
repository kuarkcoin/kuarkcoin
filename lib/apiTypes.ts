export type SignalDirection = "BUY" | "SELL";
export type SignalOutcome = "WIN" | "LOSS" | null;

export type SignalRow = {
  id: number;
  created_at: string;
  symbol: string;
  signal: SignalDirection | string;
  price: number | null;
  score: number | null;
  reasons: string | null;
  outcome: SignalOutcome;
};

export type CreateSignalBody = {
  secret?: string;
  symbol?: string;
  signal?: string;
  price?: number | string | null;
  score?: number | string | null;
  reasons?: string | null;
  t?: number | string | null;
};

export type PatchSignalBody = {
  id?: number | string;
  outcome?: "WIN" | "LOSS" | null;
};

export type NewsInputItem = {
  headline: string;
  source?: string | null;
  url?: string | null;
  datetime?: number | string | null;
  summary?: string | null;
};

export type AnalyzeNewsBody = {
  symbol?: string;
  newsItems?: NewsInputItem[];
};

export type TopSignalInput = Pick<SignalRow, "symbol" | "price" | "score" | "reasons"> & Partial<Pick<SignalRow, "id" | "signal" | "created_at" | "outcome">>;

export type TopCommentaryBody = {
  topBuy?: TopSignalInput[];
  topSell?: TopSignalInput[];
};

export type FinnhubMetricResponse = {
  metric?: {
    grossMarginTTM?: number | string | null;
    grossMarginAnnual?: number | string | null;
    grossMargin?: number | string | null;
    netMarginTTM?: number | string | null;
    netMarginAnnual?: number | string | null;
    netMargin?: number | string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type FinnhubFinancialStatementItem = {
  concept?: string | null;
  label?: string | null;
  name?: string | null;
  tag?: string | null;
  value?: number | string | null;
  val?: number | string | null;
  amount?: number | string | null;
  [key: string]: unknown;
};

export type FinnhubFinancialReport = {
  ic?: FinnhubFinancialStatementItem[];
  incomeStatement?: FinnhubFinancialStatementItem[];
  income_statement?: FinnhubFinancialStatementItem[];
  incomestatement?: FinnhubFinancialStatementItem[];
  is?: FinnhubFinancialStatementItem[];
  data?: FinnhubFinancialStatementItem[];
  items?: FinnhubFinancialStatementItem[];
  [key: string]: unknown;
};

export type FinnhubFinancialsReportedItem = {
  endDate?: string | null;
  reportDate?: string | null;
  year?: string | number | null;
  report?: FinnhubFinancialReport;
  reportContent?: FinnhubFinancialReport;
  [key: string]: unknown;
};

export type FinnhubFinancialsReportedResponse = {
  data?: FinnhubFinancialsReportedItem[];
  [key: string]: unknown;
};
