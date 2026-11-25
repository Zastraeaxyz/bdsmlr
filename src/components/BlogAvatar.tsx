import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import { getCachedBlogAvatar, useBlogAvatar } from "~/lib/blogAvatar";
import { Avatar } from "./ui/avatar";

interface BlogAvatarProps {
  blogId?: number | null;
  blogName?: string | null;
  size?: number;
  linkable?: boolean;
  class?: string;
}

/**
 * Blog avatars come from get-blog, which has no batch endpoint here. A feed
 * can contain posts from hundreds of blogs, so wait until an avatar is close
 * to the viewport before paying for its lookup. Off-screen cards keep their
 * initials fallback.
 */
const OBSERVER_MARGIN = "200px";

export function BlogAvatar(props: BlogAvatarProps) {
  const [visible, setVisible] = createSignal(false);
  let host: HTMLSpanElement | undefined;

  onMount(() => {
    const id = props.blogId;
    if (!id || getCachedBlogAvatar(id)) {
      setVisible(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined" || !host) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setVisible(true);
      },
      { rootMargin: OBSERVER_MARGIN },
    );
    observer.observe(host);
    onCleanup(() => observer.disconnect());
  });

  const avatar = useBlogAvatar(() => (visible() ? (props.blogId ?? null) : null));
  const size = () => props.size ?? 28;

  const content = () => (
    <Avatar
      src={avatar()}
      fallback={props.blogName ?? "?"}
      class={props.class}
      style={{ width: `${size()}px`, height: `${size()}px` }}
    />
  );

  const linkable = () => props.linkable !== false && !!props.blogName;

  return (
    <span ref={host} class="inline-flex shrink-0">
      <Show when={linkable()} fallback={content()}>
        <A
          href={`/${props.blogName}`}
          class="inline-flex shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content()}
        </A>
      </Show>
    </span>
  );
}
