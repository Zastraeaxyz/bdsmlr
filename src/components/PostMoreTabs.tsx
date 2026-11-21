import { createSignal, Show } from "solid-js";
import type { Post } from "~/lib/api";
import { RelatedPostsFeed } from "~/components/RelatedPosts";
import { BlogHistoricPosts } from "~/components/BlogHistoricPosts";

type MoreTab = "related" | "blog";

export function PostMoreTabs(props: { post: Post }) {
  const [tab, setTab] = createSignal<MoreTab>("related");
  const [blogSeen, setBlogSeen] = createSignal(false);

  const blogName = () => props.post.blogName ?? "";
  const canShowBlog = () =>
    !!props.post.id &&
    !!props.post.blogId &&
    !!props.post.blogName &&
    !!props.post.createdAtUnix;

  const select = (next: MoreTab) => {
    if (next === "blog") setBlogSeen(true);
    setTab(next);
  };

  return (
    <section class="related-posts">
      <div
        class="search-tabs related-tabs"
        role="tablist"
        aria-label="More posts"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab() === "related"}
          class={tab() === "related" ? "search-tab active" : "search-tab"}
          onClick={() => select("related")}
        >
          More like this
        </button>
        <Show when={canShowBlog()}>
          <button
            type="button"
            role="tab"
            aria-selected={tab() === "blog"}
            class={tab() === "blog" ? "search-tab active" : "search-tab"}
            title={`More from ${blogName()}`}
            onClick={() => select("blog")}
          >
            More from {blogName()}
          </button>
        </Show>
      </div>

      <div
        role="tabpanel"
        style={tab() === "related" ? undefined : "display:none"}
      >
        <RelatedPostsFeed postId={props.post.id} />
      </div>

      <Show when={canShowBlog()}>
        <div
          role="tabpanel"
          style={tab() === "blog" ? undefined : "display:none"}
        >
          <Show when={blogSeen()}>
            <BlogHistoricPosts
              postId={props.post.id}
              blogId={Number(props.post.blogId)}
              blogName={props.post.blogName!}
              createdAtUnix={Number(props.post.createdAtUnix)}
            />
          </Show>
        </div>
      </Show>
    </section>
  );
}
