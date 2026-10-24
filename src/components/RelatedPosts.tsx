import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { relatedPosts, type Post } from "~/lib/api";
import { useAuth } from "~/lib/useAuth";
import { PostCard } from "~/components/PostCard";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { LightBox } from "~/components/LightBox";
import { upgradeToLightbox } from "~/lib/sanitize";
import { tagSearchHref } from "~/lib/tagLinks";

const PAGE_SIZE = 6;

export function RelatedPosts(props: { postId: number }) {
  const navigate = useNavigate();
  const { activeBlog } = useAuth();
  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const [lightboxUrl, setLightboxUrl] = createSignal<string | null>(null);
  let nextPageToken: string | null = null;

  const load = async () => {
    if (!props.postId) return;
    setLoading(true);
    setError("");
    setPosts([]);
    nextPageToken = null;
    if (!activeBlog()) {
      setLoading(false);
      return;
    }
    try {
      const data = await relatedPosts(
        props.postId,
        activeBlog()?.name,
        PAGE_SIZE,
      );
      const incoming = data.posts ?? [];
      setPosts(incoming);
      nextPageToken = data.page?.nextPageToken ?? null;
      if (incoming.length < PAGE_SIZE) nextPageToken = null;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load related posts");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    props.postId;
    activeBlog()?.name;
    void load();
  });

  const loadMore = async () => {
    if (!nextPageToken || loadingMore()) return;
    setLoadingMore(true);
    const token = nextPageToken;
    try {
      const data = await relatedPosts(
        props.postId,
        activeBlog()?.name,
        PAGE_SIZE,
        token,
      );
      const incoming = data.posts ?? [];
      setPosts((prev) => [...prev, ...incoming]);
      nextPageToken = data.page?.nextPageToken ?? null;
      if (incoming.length < PAGE_SIZE) nextPageToken = null;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more posts");
    } finally {
      setLoadingMore(false);
    }
  };

  const openTag = (tag: string) => {
    navigate(tagSearchHref(tag));
  };

  return (
    <section class="related-posts">
      <h3 class="section-title">More like this</h3>
      {error() && <p class="error">{error()}</p>}
      {loading() && <p class="loading">Loading related posts…</p>}
      <Show when={!loading()}>
        <Show
          when={posts().length > 0}
          fallback={<p class="empty">No related posts found.</p>}
        >
          <div class="feed">
            <For each={posts()}>
              {(post) => (
                <PostCard
                  post={post}
                  onTagClick={openTag}
                  onImageClick={(url) =>
                    setLightboxUrl(upgradeToLightbox(url))
                  }
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
      <Show when={nextPageToken}>
        <AutoLoadMore
          onLoad={loadMore}
          loading={loadingMore()}
          style="display:block;margin:16px auto 0"
          label="Load more related posts"
        />
      </Show>
      <LightBox url={lightboxUrl()} onClose={() => setLightboxUrl(null)} />
    </section>
  );
}
