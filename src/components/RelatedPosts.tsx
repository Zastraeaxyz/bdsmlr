import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { useNavigate } from "@solidjs/router";
import { relatedPosts, type Post } from "~/lib/api";
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
  const [nextPageToken, setNextPageToken] = createSignal<string | null>(null);
  const gallery = createMediaGallery({ posts: () => posts() });

  const load = async () => {
    if (!props.postId) return;
    setLoading(true);
    setError("");
    setPosts([]);
    setNextPageToken(null);
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
      let token = data.page?.nextPageToken ?? null;
      if (incoming.length < PAGE_SIZE) token = null;
      setNextPageToken(token);
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
    const token = nextPageToken();
    if (!token || loadingMore()) return;
    setLoadingMore(true);
    try {
      const data = await relatedPosts(
        props.postId,
        activeBlog()?.name,
        PAGE_SIZE,
        token,
      );
      const incoming = data.posts ?? [];
      setPosts((prev) => [...prev, ...incoming]);
      let next = data.page?.nextPageToken ?? null;
      if (incoming.length < PAGE_SIZE) next = null;
      setNextPageToken(next);
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
      <Show when={nextPageToken()}>
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
