import { For } from "solid-js";
import type { Post } from "~/lib/api";
import { cx } from "@/lib/cva";
import { PostCard } from "./PostCard";

export function PostFeed(props: {
  posts: Post[];
  onTagClick?: (tag: string) => void;
  onImageClick?: (url: string, postId: number) => void;
  class?: string;
}) {
  return (
    <div class={cx("flex flex-col gap-2 sm:gap-3", props.class)}>
      <For each={props.posts}>
        {(post) => (
          <PostCard
            post={post}
            onTagClick={props.onTagClick}
            onImageClick={props.onImageClick}
          />
        )}
      </For>
    </div>
  );
}
