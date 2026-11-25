import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { useNavigate } from "@solidjs/router";
import { relatedPosts, type Post } from "~/lib/api";
import { takeFreshPosts } from "~/lib/feedPagination";
import { useAuth } from "~/lib/useAuth";
import { PostFeed } from "~/components/PostFeed";
import { FeedSkeleton, EmptyState } from "~/components/FeedStates";
import { Alert, AlertDescription } from "./ui/alert";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { LightBox } from "~/components/LightBox";
import { createMediaGallery } from "~/lib/mediaGallery";
import { tagSearchHref } from "~/lib/tagLinks";

const PAGE_SIZE = 6;

export function RelatedPostsFeed(props: { postId: number }) {
  const navigate = useNavigate();
  const { activeBlog } = useAuth();
  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const [hasMore, setHasMore] = createSignal(false);
  const gallery = createMediaGallery({ posts: () => posts() });

  // The server ignores page_size for this endpoint and returns its whole
  // recommendation window (often more than 200 posts). Rendering all of them
  // made the app ask for one blog record per author just to draw the avatars,
  // which is how a single post page turned into hundreds of get-blog calls.
  // Keep the extra posts here and reveal them a page at a time instead.
  let buffer: Post[] = [];
  let serverToken: string | null = null;
  let loadedIds = new Set<number>();

  const reveal = (replace = false): number => {
    const visible = takeFreshPosts(buffer, PAGE_SIZE, loadedIds);
    if (visible.length > 0) {
      setPosts((prev) => (replace ? visible : [...prev, ...visible]));
    } else if (replace) {
      setPosts([]);
    }
    return visible.length;
  };

  const updateHasMore = () => {
    setHasMore(buffer.length > 0 || !!serverToken);
  };

  const load = async () => {
    if (!props.postId) return;
    setLoading(true);
    setError("");
    setPosts([]);
    setHasMore(false);
    buffer = [];
    serverToken = null;
    loadedIds = new Set();
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
      buffer = data.posts ?? [];
      serverToken = data.page?.nextPageToken ?? null;
      reveal(true);
      updateHasMore();
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
    if (loadingMore()) return;
    if (buffer.length > 0) {
      // Reveal from the buffer as if it were a loaded page, so the automatic
      // loader can keep going while the button is still on screen.
      setLoadingMore(true);
      reveal();
      updateHasMore();
      requestAnimationFrame(() => setLoadingMore(false));
      return;
    }
    const token = serverToken;
    if (!token) {
      setHasMore(false);
      return;
    }
    setLoadingMore(true);
    try {
      const before = loadedIds.size;
      const data = await relatedPosts(
        props.postId,
        activeBlog()?.name,
        PAGE_SIZE,
        token,
      );
      buffer = data.posts ?? [];
      serverToken = data.page?.nextPageToken ?? null;
      reveal();
      // A page made entirely of posts we already show means the server is
      // echoing the same window: stop instead of looping on that token.
      if (loadedIds.size === before && buffer.length === 0) {
        setHasMore(false);
      } else {
        updateHasMore();
      }
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
    <>
<Show when={error()}>
        <FeedErrorNotice message={error()} />
      </Show>
      <Show when={loading()}>
        <FeedSkeleton count={2} />
      </Show>
      <Show when={!loading()}>
        <Show
          when={posts().length > 0}
          fallback={<EmptyState>No related posts found.</EmptyState>}
        >
          <PostFeed
            posts={posts()}
            onTagClick={openTag}
            onImageClick={(url, postId) => gallery.open(url, postId)}
          />
        </Show>
      </Show>
      <Show when={hasMore()}>
        <AutoLoadMore
          onLoad={loadMore}
          loading={loadingMore()}
          ready={!loading()}
          label="Load more related posts"
        />
      </Show>
      <LightBox gallery={gallery} />
    </>
  );
}

/**
 * The original "More like this" section. Kept as a standalone wrapper so the
 * old presentation remains available outside the post-page tab layout.
 */
export function RelatedPosts(props: { postId: number }) {
  return (
    <section class="mt-6">
      <h3 class="mb-3 text-lg font-semibold">More like this</h3>
      <RelatedPostsFeed postId={props.postId} />
    </section>
  );
}
