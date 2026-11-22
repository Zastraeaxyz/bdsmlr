import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { upstreamLimitedUntil } from "~/lib/upstreamLimit";

/**
 * Shows up when BDSMLR's edge starts refusing requests. Without this a user
 * just sees several sections fail at once and assumes the app is broken.
 */
export default function RateLimitBanner() {
  const [now, setNow] = createSignal(Date.now());

  createEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(timer));
  });

  const remaining = () => {
    const until = upstreamLimitedUntil();
    if (!until) return 0;
    return Math.max(0, Math.ceil((until - now()) / 1000));
  };

  return (
    <Show when={remaining() > 0}>
      <div class="rate-limit-banner" role="status">
        <strong>BDSMLR is rate limiting us.</strong>
        <span>
          Some feeds and posts may not load for a minute or two. The site itself
          is fine and nothing was lost.
        </span>
        <span class="rate-limit-banner-count">
          Try again in {remaining()}s
        </span>
      </div>
    </Show>
  );
}
