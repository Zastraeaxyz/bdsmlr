import { createEffect, onCleanup, onMount } from "solid-js";

interface AutoLoadMoreProps {
  onLoad: () => void;
  loading: boolean;
  label?: string;
  loadingLabel?: string;
  class?: string;
  style?: string;
  rootMargin?: string;
  /** Scroll container to observe within. Defaults to the viewport. */
  root?: () => HTMLElement | null | undefined;
  /** Set false while the surface is still doing its initial load. */
  ready?: boolean;
}

interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function parseMargin(value: string): Margin {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => Number.parseFloat(part) || 0);
  const top = parts[0] ?? 0;
  const right = parts[1] ?? top;
  const bottom = parts[2] ?? top;
  const left = parts[3] ?? right;
  return { top, right, bottom, left };
}

export function AutoLoadMore(props: AutoLoadMoreProps) {
  let button: HTMLButtonElement | undefined;
  let observer: IntersectionObserver | undefined;
  let requested = false;
  let requestedHeight = 0;

  const root = () => props.root?.() ?? null;

  const measuredHeight = () => {
    const element = root();
    if (element) return element.scrollHeight;
    if (typeof document === "undefined") return 0;
    return document.documentElement.scrollHeight;
  };

  const isVisible = () => {
    if (!button) return false;
    const rect = button.getBoundingClientRect();
    const margin = parseMargin(props.rootMargin ?? "200px 0px");
    const element = root();
    const bounds = element
      ? element.getBoundingClientRect()
      : {
          top: 0,
          left: 0,
          bottom: typeof window === "undefined" ? 0 : window.innerHeight,
          right: typeof window === "undefined" ? 0 : window.innerWidth,
        };
    return (
      rect.top < bounds.bottom + margin.bottom &&
      rect.bottom > bounds.top - margin.top
    );
  };

  const trigger = () => {
    if (requested || props.loading || props.ready === false) return;
    if (!isVisible()) return;
    requested = true;
    requestedHeight = measuredHeight();
    props.onLoad();
  };

  // A manual click is always allowed, even if an earlier automatic attempt
  // found nothing to load. The button stays as the fallback.
  const handleClick = () => {
    requested = false;
    trigger();
  };

  onMount(() => {
    if (!button) return;
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) trigger();
      },
      {
        root: root(),
        rootMargin: props.rootMargin ?? "200px 0px",
      },
    );
    observer.observe(button);
  });

  // Keep paging while the button stays in view (short pages and small batches
  // never move it out of view, so IntersectionObserver does not fire again).
  // The check waits a frame so scroll restoration and layout settle first.
  createEffect(() => {
    if (props.loading || props.ready === false) return;
    const wasRequested = requested;
    const previousHeight = requestedHeight;
    requested = false;
    requestAnimationFrame(() => {
      // Only follow up when the previous load actually added content. This
      // avoids retrying in a tight loop after a failed request.
      if (wasRequested && measuredHeight() <= previousHeight) return;
      trigger();
    });
  });

  onCleanup(() => observer?.disconnect());

  return (
    <button
      ref={button}
      type="button"
      class={props.class ? `btn-ghost ${props.class}` : "btn-ghost"}
      style={props.style ?? "display:block;margin:24px auto"}
      onClick={handleClick}
      disabled={props.loading}
      aria-busy={props.loading}
    >
      {props.loading
        ? (props.loadingLabel ?? "Loading more")
        : (props.label ?? "Load more")}
    </button>
  );
}
