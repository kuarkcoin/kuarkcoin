import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignalPreviewCard } from "./SignalPreviewCard";

describe("SignalPreviewCard", () => {
  it("shows +N when there are more than two indicators", () => {
    const html = renderToStaticMarkup(<SignalPreviewCard row={{ id: 1, symbol: "NASDAQ:AAPL", signal: "BUY", reasons: ["RSI", "MACD", "Volume", "Trend"] }} />);
    expect(html).toContain("RSI");
    expect(html).toContain("MACD");
    expect(html).toContain("+2");
  });

  it("renders BUY and SELL aria-labels", () => {
    expect(renderToStaticMarkup(<SignalPreviewCard row={{ signal: "BUY" }} />)).toContain('aria-label="BUY signal"');
    expect(renderToStaticMarkup(<SignalPreviewCard row={{ signal: "SELL" }} />)).toContain('aria-label="SELL signal"');
  });

  it("handles missing date", () => {
    expect(renderToStaticMarkup(<SignalPreviewCard row={{ symbol: "AAPL", signal: "BUY" }} />)).toContain("—");
  });

  it("handles missing indicators", () => {
    const html = renderToStaticMarkup(<SignalPreviewCard row={{ symbol: "AAPL", signal: "BUY", reasons: null }} />);
    expect(html).not.toContain("+1");
  });
});
