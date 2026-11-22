import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isUpstreamRateLimited,
  noteUpstreamRateLimit,
  noteUpstreamSuccess,
  upstreamLimitedUntil,
} from "./upstreamLimit";

describe("upstreamLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
    noteUpstreamSuccess();
  });

  it("starts out not limited", () => {
    expect(isUpstreamRateLimited()).toBe(false);
    expect(upstreamLimitedUntil()).toBe(0);
  });

  it("stays limited until the retry window passes", () => {
    vi.useFakeTimers();
    noteUpstreamRateLimit(30);

    expect(isUpstreamRateLimited()).toBe(true);
    expect(upstreamLimitedUntil()).toBeGreaterThan(Date.now());

    vi.advanceTimersByTime(31_000);
    expect(isUpstreamRateLimited()).toBe(false);
  });

  it("keeps the longest window when several requests fail at once", () => {
    vi.useFakeTimers();
    noteUpstreamRateLimit(10);
    const first = upstreamLimitedUntil();
    noteUpstreamRateLimit(90);
    expect(upstreamLimitedUntil()).toBeGreaterThan(first);
  });

  it("clears as soon as a request succeeds again", () => {
    noteUpstreamRateLimit(60);
    expect(isUpstreamRateLimited()).toBe(true);
    noteUpstreamSuccess();
    expect(isUpstreamRateLimited()).toBe(false);
  });

  it("caps absurd retry windows", () => {
    vi.useFakeTimers();
    noteUpstreamRateLimit(100_000);
    expect(upstreamLimitedUntil() - Date.now()).toBeLessThanOrEqual(300_000);
  });
});
