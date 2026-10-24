import { createSignal, Show } from "solid-js";
import { AutoLoopVideo } from "~/components/AutoLoopVideo";
import type { PostMediaItem } from "~/lib/sanitize";

export function PostMedia(props: {
  item: PostMediaItem;
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
      fallback={<AutoLoopVideo src={current().url} onError={next} />}
    >
      <img
        src={current().url}
        alt=""
        onError={next}
        onClick={() => props.onImageClick?.(current().url)}
      />
    </Show>
  );
}
