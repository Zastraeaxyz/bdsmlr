import { createSignal, createEffect, For, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import {
  listBlogActivity,
  SortField,
  SortOrder,
  type Post,
} from "~/lib/api";
import { useAuth } from "~/lib/useAuth";
import SortDropdown, { sortOptionLabel } from "~/components/SortDropdown";
import { createMediaGallery } from "~/lib/mediaGallery";
import Header from "~/components/Header";
import { LightBox } from "~/components/LightBox";
import ViewDropdown from "~/components/ViewDropdown";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { PostCard } from "~/components/PostCard";
import {
  loadFeedView,
  saveFeedView,
  type FeedView,
} from "~/lib/feedView";
import { trackEvent } from "~/lib/analytics";

export default function LikedPosts() {
  const { user, activeBlogId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);
  const [error, setError] = createSignal("");
  const gallery = createMediaGallery({ posts: () => posts() });
  const [sortField, setSortField] = createSignal(SortField.Date);
  const [sortOrder, setSortOrder] = createSignal(SortOrder.Descending);
  const [view, setView] = createSignal<FeedView>(loadFeedView());
  let nextPageToken: string | null = searchParams.page_token || null;

  const syncUrl = () => {
    setSearchParams(
      { page_token: nextPageToken || undefined },
      { replace: true },
    );
  };

  const fetchLiked = async () => {
    const u = user();
    const blogId = activeBlogId();
    if (!u || !blogId) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadingMore(false);
    setError("");
    setPosts([]);
    setHasMore(true);
    try {
      const data = await listBlogActivity({
        blog_id: blogId,
        sort_field: sortField(),
        order: sortOrder(),
        post_types: [1, 2, 3, 4, 5, 6, 7],
        activity_kinds: ["like"],
        page: nextPageToken
          ? { page_size: 20, page_token: nextPageToken }
          : { page_size: 20 },
      });
      const incoming = data.posts ?? [];
      setPosts(incoming);
      nextPageToken = data.page?.nextPageToken ?? null;
      if (!nextPageToken) setHasMore(false);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load liked posts");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    fetchLiked();
  });

  const loadMore = async () => {
    const u = user();
    const blogId = activeBlogId();
    if (!u || !blogId || !hasMore() || loadingMore() || !nextPageToken) return;
    setLoadingMore(true);
    const token = nextPageToken;
    nextPageToken = null;
    try {
      const data = await listBlogActivity({
        blog_id: blogId,
        sort_field: sortField(),
        order: sortOrder(),
        post_types: [1, 2, 3, 4, 5, 6, 7],
        activity_kinds: ["like"],
        page: { page_size: 20, page_token: token },
      });
      const incoming = data.posts ?? [];
      setPosts((prev) => [...prev, ...incoming]);
      nextPageToken = data.page?.nextPageToken ?? null;
      if (!nextPageToken) setHasMore(false);
      syncUrl();
    } catch {
      nextPageToken = token;
      syncUrl();
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div class="home-page">
      <Title>Liked posts — bbdsmlr</Title>
      <Header info="Liked posts" />
      <main>
        <div class="search-bar">
          <SortDropdown
            value={`${sortField()}-${sortOrder()}`}
            onChange={(sf, so) => {
              trackEvent("sort-change", { surface: "liked", sort: sortOptionLabel(sf, so) });
              setSortField(sf);
              setSortOrder(so);
              nextPageToken = null;
              setPosts([]);
              setHasMore(true);
              fetchLiked();
            }}
          />
          <ViewDropdown
            value={view()}
            onChange={(v) => {
              trackEvent("view-change", { surface: "liked", view: v });
              setView(v);
              saveFeedView(v);
            }}
          />
        </div>

        {error() && <p class="error">{error()}</p>}

        {loading() && <p class="loading">Loading liked posts…</p>}

        <Show when={!loading()}>
          <Show
            when={posts().length > 0}
            fallback={<p class="empty">No liked posts yet.</p>}
          >
            <div
              class={view() === "grid" ? "feed feed-grid" : "feed"}
            >
              <For each={posts()}>
                {(post) => (
                  <PostCard
                    post={post}
                    onImageClick={(url, postId) =>
                      gallery.open(url, postId)
                    }
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>

        <AutoLoadMore
          onLoad={() => {
            trackEvent("load-more", { surface: "liked" });
            void loadMore();
          }}
          loading={loadingMore()}
          ready={!loading()}
        />
      </main>
      <LightBox gallery={gallery} />
    </div>
  );
}

