import { createSignal, For, Show } from "solid-js";
import { cx } from "@/lib/cva";
import { PostMedia } from "~/components/PostMedia";
import type { PostMediaItem } from "~/lib/sanitize";
import { Button } from "./ui/button";

const COLLAPSED_COUNT = 2;

export function PostMediaList(props: {
  items: PostMediaItem[];
  class?: string;
  showAll?: boolean;
  onImageClick?: (url: string) => void;
}) {
  const [expanded, setExpanded] = createSignal(false);
  const hiddenCount = () =>
    props.showAll ? 0 : Math.max(0, props.items.length - COLLAPSED_COUNT);
  const visible = () =>
    props.showAll || expanded()
      ? props.items
      : props.items.slice(0, COLLAPSED_COUNT);

  const single = () => visible().length === 1;

  return (
    <div class={cx("flex flex-col gap-1", props.class)}>
      <div
        class={cx(
          "grid gap-1 overflow-hidden bg-muted",
          single() ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        <For each={visible()}>
          {(item) => (
            <PostMedia
              item={item}
              class={
                single()
                  ? "h-auto max-h-[75dvh] object-contain"
                  : "aspect-square h-full w-full object-cover"
              }
              onImageClick={(url) => props.onImageClick?.(url)}
            />
          )}
        </For>
      </div>
      <Show when={hiddenCount() > 0}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="self-center text-xs"
          aria-expanded={expanded()}
          onClick={() => setExpanded(!expanded())}
        >
          {expanded() ? "Show less" : `Show ${hiddenCount()} more`}
        </Button>
      </Show>
    </div>
  );
}
