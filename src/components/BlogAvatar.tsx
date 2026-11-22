import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { useBlogAvatar } from "~/lib/blogAvatar";
import { Avatar } from "./ui/avatar";

interface BlogAvatarProps {
  blogId?: number | null;
  blogName?: string | null;
  size?: number;
  linkable?: boolean;
  class?: string;
}

export function BlogAvatar(props: BlogAvatarProps) {
  const avatar = useBlogAvatar(() => props.blogId ?? null);
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
    <Show
      when={linkable()}
      fallback={<span class="inline-flex shrink-0">{content()}</span>}
    >
      <A
        href={`/${props.blogName}`}
        class="inline-flex shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content()}
      </A>
    </Show>
  );
}
