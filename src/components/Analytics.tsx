import { createEffect, onCleanup } from "solid-js";
import { useLocation } from "@solidjs/router";
import { trackPageview } from "~/lib/analytics";

export function Analytics() {
  const location = useLocation();
  let timer: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    const pathname = location.pathname;
    if (typeof window === "undefined") return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      trackPageview(pathname);
    }, 0);
  });

  onCleanup(() => {
    if (timer !== undefined) clearTimeout(timer);
  });

  return null;
}
