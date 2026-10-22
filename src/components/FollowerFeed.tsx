import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  listBlogsRecentActivity,
  resolveIdentifier,
  type Post,
} from "~/lib/api";
import { fetchAllFollowerIds } from "~/lib/following";
import { PostCard } from "~/components/PostCard";
import { LightBox } from "~/components/LightBox";
import { upgradeToLightbox } from "~/lib/sanitize";

const PAGE_SIZE = 20;

export function FollowerFeed(props: { blogName: string }) {
  const navigate = useNavigate();
  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const [lightboxUrl, setLightboxUrl] = createSignal<string | null>(null);
  let followerIds: number[] = [];
  let nextPageToken: string | null = null;

  const load = async () => {
    setLoading(true);
    setError("");
    setPosts([]);
    nextPageToken = null;
    try {
      const resolved = await resolveIdentifier(props.blogName);
      if (!resolved.blogId) {
        setError(resolved.error || "Blog not found");
        return;
      }
      followerIds = await fetchAllFollowerIds(resolved.blogId);
      if (followerIds.length === 0) {
        setPosts([]);
        return;
      }
      const data = await listBlogsRecentActivity(followerIds, PAGE_SIZE);
      const incoming = data.posts ?? [];
      setPosts(incoming);
      nextPageToken = data.page?.nextPageToken ?? null;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load follower feed");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    props.blogName;
    void load();
  });

  const loadMore = async () => {
    if (!nextPageToken || loadingMore()) return;
    setLoadingMore(true);
    const token = nextPageToken;
    try {
      const data = await listBlogsRecentActivity(
        followerIds,
        PAGE_SIZE,
        token,
      );
      const incoming = data.posts ?? [];
      setPosts((prev) => [...prev, ...incoming]);
      nextPageToken = data.page?.nextPageToken ?? null;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const openTag = (tag: string) => {
    navigate(`/tag/${encodeURIComponent(tag)}`);
  };

  return (
    <div>
      {error() && <p class="error">{error()}</p>}
      {loading() && <p class="loading">Loading follower feed…</p>}
      <Show when={!loading()}>
        <Show
          when={posts().length > 0}
          fallback={<p class="empty">No posts from this blog's followers.</p>}
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
        <button
          type="button"
          class="btn-ghost"
          style="display:block;margin:24px auto"
          onClick={loadMore}
          disabled={loadingMore()}
        >
          {loadingMore() ? "Loading more" : "Load more"}
        </button>
      </Show>
      <LightBox url={lightboxUrl()} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
