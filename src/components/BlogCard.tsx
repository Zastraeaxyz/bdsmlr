import { Show } from "solid-js";
import { A } from "@solidjs/router";
import type { Blog } from "~/lib/api";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";

export function BlogCard(props: { blog: Blog }) {
  return (
    <A
      href={`/${props.blog.name}`}
      class="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
    >
      <Avatar
        src={props.blog.avatarUrl}
        fallback={props.blog.title || props.blog.name || "?"}
        class="size-12"
      />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold">
          {props.blog.title || props.blog.name}
        </span>
        <span class="block truncate text-xs text-muted-foreground">
          @{props.blog.name}
        </span>
        <Show when={props.blog.description}>
          <span class="mt-1 line-clamp-2 block text-xs text-muted-foreground">
            {props.blog.description}
          </span>
        </Show>
        <span class="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary" class="font-normal">
            {props.blog.followersCount ?? 0} followers
          </Badge>
          <Show when={props.blog.postsCount != null}>
            <Badge variant="secondary" class="font-normal">
              {props.blog.postsCount} posts
            </Badge>
          </Show>
        </span>
      </span>
    </A>
  );
}
