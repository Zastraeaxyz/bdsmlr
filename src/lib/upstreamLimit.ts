import { createSignal } from "solid-js";

/**
 * Tracks whether BDSMLR (usually via Cloudflare) is refusing requests from
 * this deployment. The server proxy turns those refusals into a JSON 429 with
 * `Retry-After`, so the client can say what is going on instead of showing a
 * generic failure. Nothing about the user's data is wrong when this happens.
 */

const DEFAULT_RETRY_SECONDS = 60;

const [limitedUntil, setLimitedUntil] = createSignal(0);

export function noteUpstreamRateLimit(retryAfterSeconds?: number): void {
  const seconds =
    typeof retryAfterSeconds === "number" && Number.isFinite(retryAfterSeconds)
      ? Math.max(1, Math.min(retryAfterSeconds, 300))
      : DEFAULT_RETRY_SECONDS;
  const until = Date.now() + seconds * 1000;
  setLimitedUntil((previous) => Math.max(previous, until));
}

export function noteUpstreamSuccess(): void {
  if (limitedUntil() !== 0) setLimitedUntil(0);
}

export function upstreamLimitedUntil(): number {
  return limitedUntil();
}

export function isUpstreamRateLimited(): boolean {
  return limitedUntil() > Date.now();
}
