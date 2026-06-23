export type MarketDataProviderStatus =
  | { configured: true }
  | { configured: false; message: "Market data provider not configured" };

export type MarketDataProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export type OhlcBar = {
  symbol: string;
  timeframe: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
};

export type LatestPrice = {
  symbol: string;
  price: number;
  time: string;
};

export interface MarketDataProvider {
  readonly name: string;
  readonly status: MarketDataProviderStatus;
  getBars(input: { symbol: string; timeframe: string; from: Date; to: Date }): Promise<MarketDataProviderResult<OhlcBar[]>>;
  getLatestPrice(input: { symbol: string }): Promise<MarketDataProviderResult<LatestPrice>>;
}

class UnconfiguredMarketDataProvider implements MarketDataProvider {
  readonly name = "unconfigured";
  readonly status = {
    configured: false,
    message: "Market data provider not configured",
  } as const;

  async getBars(): Promise<MarketDataProviderResult<OhlcBar[]>> {
    return { ok: false, code: "MARKET_DATA_PROVIDER_NOT_CONFIGURED", error: this.status.message };
  }

  async getLatestPrice(): Promise<MarketDataProviderResult<LatestPrice>> {
    return { ok: false, code: "MARKET_DATA_PROVIDER_NOT_CONFIGURED", error: this.status.message };
  }
}

export function getMarketDataProvider(): MarketDataProvider {
  return new UnconfiguredMarketDataProvider();
}
