import { describe, expect, it } from "vitest";
import { formatSignalTime } from "./format-signal-time";

describe("formatSignalTime", () => {
  const now = new Date("2026-06-19T12:00:00.000Z");

  it("formats relative time for recent dates", () => {
    expect(formatSignalTime("2026-06-19T11:45:00.000Z", now)).toBe("15 dk önce");
  });

  it("formats older dates as a stable date string", () => {
    expect(formatSignalTime("2026-06-17T08:30:00.000Z", now)).toContain("17");
  });

  it("returns a dash for invalid dates", () => {
    expect(formatSignalTime("not-a-date", now)).toBe("—");
  });

  it("returns a dash for missing dates", () => {
    expect(formatSignalTime(null, now)).toBe("—");
    expect(formatSignalTime(undefined, now)).toBe("—");
  });
});
