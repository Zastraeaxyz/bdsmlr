import { createSignal, Show } from "solid-js";
import { cx } from "@/lib/cva";
import { AutoLoopVideo } from "~/components/AutoLoopVideo";
import type { PostMediaItem } from "~/lib/sanitize";

export function PostMedia(props: {
  item: PostMediaItem;
  class?: string;
  onImageClick?: (url: string) => void;
}) {
  const [index, setIndex] = createSignal(0);
  const candidates = () => [props.item, ...props.item.fallbacks];
  const current = () =>
    candidates()[Math.min(index(), candidates().length - 1)] ?? props.item;

  const next = () => {
    if (index() < candidates().length - 1) setIndex(index() + 1);
  };

  return (
    <Show
      when={current().type === "image"}
      fallback={
        <div class="w-full bg-muted [&_video]:h-auto [&_video]:max-h-[75dvh] [&_video]:w-full">
          <AutoLoopVideo src={current().url} onError={next} />
        </div>
      }
    >
      <button
        type="button"
        class="group relative block w-full cursor-zoom-in overflow-hidden bg-muted"
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
          onError={next}
        />
      </button>
    </Show>
  );
}
