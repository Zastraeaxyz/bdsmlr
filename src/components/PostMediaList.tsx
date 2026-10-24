import { createSignal, For, Show } from "solid-js";
import { PostMedia } from "~/components/PostMedia";
import type { PostMediaItem } from "~/lib/sanitize";

const COLLAPSED_COUNT = 2;

export function PostMediaList(props: {
  items: PostMediaItem[];
  class: string;
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

  return (
    <div class={props.class}>
      <For each={visible()}>
        {(item) => (
          <PostMedia
            item={item}
            onImageClick={(url) => props.onImageClick?.(url)}
          />
        )}
      </For>
      <Show when={hiddenCount() > 0}>
        <button
          type="button"
          class="media-toggle"
          aria-expanded={expanded()}
          onClick={() => setExpanded(!expanded())}
        >
          {expanded() ? "Show less" : `Show ${hiddenCount()} more`}
        </button>
      </Show>
    </div>
  );
}
