import { Show } from "solid-js";
import { A } from "@solidjs/router";
import type { Blog } from "~/lib/api";

export function BlogCard(props: { blog: Blog }) {
  const initial = () => (props.blog.title || props.blog.name || "?")[0];

  return (
    <A href={`/${props.blog.name}`} class="blog-card">
      <Show
        when={props.blog.avatarUrl}
        fallback={
          <span class="blog-card-avatar blog-card-avatar-fallback">
            {initial()}
          </span>
        }
      >
        <img class="blog-card-avatar" src={props.blog.avatarUrl} alt="" />
      </Show>
      <span class="blog-card-body">
        <span class="blog-card-name">
          {props.blog.title || props.blog.name}
        </span>
        <span class="blog-card-handle">@{props.blog.name}</span>
        <Show when={props.blog.description}>
          <span class="blog-card-description">{props.blog.description}</span>
        </Show>
        <span class="blog-card-stats">
          {props.blog.followersCount ?? 0} followers
          {props.blog.postsCount != null
            ? ` · ${props.blog.postsCount} posts`
            : ""}
        </span>
      </span>
    </A>
  );
}
