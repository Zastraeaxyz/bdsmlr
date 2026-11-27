import { createEffect, createSignal, on, Show } from "solid-js";
import { cx } from "@/lib/cva";
import { AutoLoopVideo } from "~/components/AutoLoopVideo";
import type { PostMediaItem } from "~/lib/sanitize";

/** Holds the media's space while a lazy image or video is still loading. */
const PLACEHOLDER_HEIGHT = "min-h-56 sm:min-h-72";

export function PostMedia(props: {
  item: PostMediaItem;
  class?: string;
  onImageClick?: (url: string) => void;
}) {
  const [index, setIndex] = createSignal(0);
  const [loaded, setLoaded] = createSignal(false);
  const candidates = () => [props.item, ...props.item.fallbacks];
  const current = () =>
    candidates()[Math.min(index(), candidates().length - 1)] ?? props.item;

  // A fallback candidate swaps the source on the same element, so reserve the
  // space again until the new media has reported its size.
  createEffect(
    on(
      () => current().url,
      () => setLoaded(false),
    ),
  );

  const next = () => {
    if (index() < candidates().length - 1) setIndex(index() + 1);
  };

  return (
    <Show
      when={current().type === "image"}
      fallback={
        <div
          class={cx(
            "w-full bg-muted [&_video]:h-auto [&_video]:max-h-[75dvh] [&_video]:w-full",
            !loaded() && PLACEHOLDER_HEIGHT,
          )}
        >
          <AutoLoopVideo
            src={current().url}
            onError={next}
            onReady={() => setLoaded(true)}
          />
        </div>
      }
    >
      <button
        type="button"
        class={cx(
          "group relative block w-full cursor-zoom-in overflow-hidden bg-muted",
          !loaded() && PLACEHOLDER_HEIGHT,
        )}
        onClick={() => props.onImageClick?.(current().url)}
        aria-label="Open image"
      >
        <img
          src={current().url}
          alt=""
          loading="lazy"
          decoding="async"
          class={cx(
            "w-full transition-transform duration-200 group-hover:scale-[1.01]",
            props.class ?? "h-auto max-h-[75dvh] object-contain",
          )}
          onLoad={() => setLoaded(true)}
          onError={next}
        />
      </button>
    </Show>
  );
}
