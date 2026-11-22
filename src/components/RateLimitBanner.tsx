import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { AlertTriangle } from "lucide-solid";
import { upstreamLimitedUntil } from "~/lib/upstreamLimit";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";

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
      <Alert
        variant="warning"
        role="status"
        class="mx-auto w-full max-w-3xl rounded-none border-x-0 border-t-0"
      >
        <AlertTriangle class="size-4" />
        <AlertTitle>BDSMLR is rate limiting us.</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-2">
          <span>
            Some feeds and posts may not load for a minute or two. The site
            itself is fine and nothing was lost.
          </span>
          <Badge variant="outline" class="shrink-0">
            Try again in {remaining()}s
          </Badge>
        </AlertDescription>
      </Alert>
    </Show>
  );
}
