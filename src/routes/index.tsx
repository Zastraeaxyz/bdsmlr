import { createSignal, createEffect, For, Show, onCleanup } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import {
  listBlogsRecentActivity,
  searchPostsByTag,
  PostType,
  SortField,
  SortOrder,
  type Post,
} from "~/lib/api";
import { getCachedFollowingIds } from "~/lib/following";
import { useAuth } from "~/lib/useAuth";
import SortDropdown from "~/components/SortDropdown";
import { upgradeToLightbox } from "~/lib/sanitize";
import Header from "~/components/Header";
import SearchHelp from "~/components/SearchHelp";
import { LightBox } from "~/components/LightBox";
import SearchHistory from "~/components/SearchHistory";
import ViewDropdown from "~/components/ViewDropdown";
import { PostCard } from "~/components/PostCard";
import {
  loadFeedView,
  saveFeedView,
  type FeedView,
} from "~/lib/feedView";
import {
  loadSearchHistory,
  addSearchHistory,
  removeSearchHistory,
} from "~/lib/searchHistory";

const HISTORY_KEY = "bdsmlr:searchHistory:home";
const PAGE_SIZE = 20;

export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  createEffect(() => {
    if (!authLoading() && !user()) {
      navigate("/login", { replace: true });
    }
  });

  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);
  const [error, setError] = createSignal("");
  const [query, setQuery] = createSignal("");
  const [activeQuery, setActiveQuery] = createSignal("");
  const [history, setHistory] = createSignal<string[]>(
    loadSearchHistory(HISTORY_KEY),
  );
  const [lightboxUrl, setLightboxUrl] = createSignal<string | null>(null);
  const [sortField, setSortField] = createSignal(SortField.Date);
  const [sortOrder, setSortOrder] = createSignal(SortOrder.Descending);
  const [view, setView] = createSignal<FeedView>(loadFeedView());
  let nextPageToken: string | null = searchParams.page_token || null;
  let searchPage = 1;
  let searchSession: string | null = null;
  let followedBlogIds: number[] = [];
  let loadMoreRef: HTMLButtonElement | undefined;

  const syncUrl = () => {
    setSearchParams(
      { page_token: nextPageToken || undefined },
      { replace: true },
    );
  };

  const fetchFeed = async () => {
    if (!user()?.blog_id) {
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
      const q = activeQuery();
      if (q) {
        searchPage = 1;
        searchSession = null;
        const data = await searchPostsByTag({
          tag_name: q,
          sort_field: sortField(),
          order: sortOrder(),
          post_types: [
            PostType.Text,
            PostType.Image,
            PostType.Video,
            PostType.Audio,
            PostType.Link,
            PostType.Chat,
            PostType.Quote,
          ],
          variants: [1],
          page: 1,
          page_size: PAGE_SIZE,
        });
        const incoming = data.posts ?? [];
        setPosts(incoming);
        searchSession = data.sessionId ?? null;
        if (incoming.length < PAGE_SIZE || !searchSession) setHasMore(false);
        searchPage++;
      } else {
        followedBlogIds = getCachedFollowingIds();
        if (followedBlogIds.length === 0) {
          setPosts([]);
          return;
        }
        const data = await listBlogsRecentActivity(followedBlogIds, 20);
        const incoming = data.posts ?? [];
        setPosts(incoming);
        nextPageToken = data.page?.nextPageToken ?? null;
        if (!nextPageToken) setHasMore(false);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (authLoading() || !user()) return;
    fetchFeed();
  });

  const loadMore = async () => {
    if (!hasMore() || loadingMore()) return;
    setLoadingMore(true);
    const token = nextPageToken;
    nextPageToken = null;
    try {
      const q = activeQuery();
      if (q) {
        if (!searchSession) {
          setHasMore(false);
          return;
        }
        const data = await searchPostsByTag({
          tag_name: q,
          sort_field: sortField(),
          order: sortOrder(),
          post_types: [
            PostType.Text,
            PostType.Image,
            PostType.Video,
            PostType.Audio,
            PostType.Link,
            PostType.Chat,
            PostType.Quote,
          ],
          variants: [1],
          page: searchPage,
          session: searchSession,
          page_size: PAGE_SIZE,
        });
        const incoming = data.posts ?? [];
        setPosts((prev) => [...prev, ...incoming]);
        searchSession = data.sessionId ?? null;
        searchPage++;
        if (incoming.length < PAGE_SIZE || !searchSession) setHasMore(false);
      } else {
        if (followedBlogIds.length === 0 || !token) return;
        const data = await listBlogsRecentActivity(
          followedBlogIds,
          PAGE_SIZE,
          token,
        );
        const incoming = data.posts ?? [];
        setPosts((prev) => [...prev, ...incoming]);
        nextPageToken = data.page?.nextPageToken ?? null;
        if (!nextPageToken) setHasMore(false);
        syncUrl();
      }
    } catch {
      nextPageToken = token;
      syncUrl();
    } finally {
      setLoadingMore(false);
    }
  };

  createEffect(() => {
    if (authLoading() || !user()) return;
    if (!loadMoreRef) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    });
    observer.observe(loadMoreRef);
    onCleanup(() => observer.disconnect());
  });

  const runSearch = (q: string) => {
    setQuery(q);
    setActiveQuery(q);
    nextPageToken = null;
    setHistory(addSearchHistory(HISTORY_KEY, q));
    fetchFeed();
  };

  const doSearch = (e: Event) => {
    e.preventDefault();
    runSearch(query());
  };

  const clearSearch = () => {
    setQuery("");
    setActiveQuery("");
    nextPageToken = null;
    fetchFeed();
  };

  const handleTagClick = (tag: string) => {
    const q = (query() ? query() + " " : "") + `tag:${tag}`;
    runSearch(q);
  };

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Title>Following feed — bbdsmlr</Title>
      <div class="home-page">
        <Header info="Following feed" />
        <main>
          <form class="search-bar" onSubmit={doSearch}>
            <SortDropdown
              value={`${sortField()}-${sortOrder()}`}
              onChange={(sf, so) => {
                setSortField(sf);
                setSortOrder(so);
                nextPageToken = null;
                fetchFeed();
              }}
              options={{
                newest: true,
                oldest: true,
                mostPopular: true,
                leastPopular: true,
                mostLiked: true,
                mostCommented: true,
                mostReblogged: true,
              }}
            />
            <div class="search-input-wrap">
              <input
                type="text"
                placeholder="Search posts…"
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
              />
              {activeQuery() && (
                <button
                  type="button"
                  class="search-input-clear"
                  onClick={clearSearch}
                >
                  ×
                </button>
              )}
              <SearchHistory
                entries={history()}
                onSelect={runSearch}
                onDelete={(q) =>
                  setHistory(removeSearchHistory(HISTORY_KEY, q))
                }
              />
            </div>
            <button type="submit">Search</button>
            <SearchHelp onFill={runSearch} />
            <ViewDropdown
              value={view()}
              onChange={(v) => {
                setView(v);
                saveFeedView(v);
              }}
            />
          </form>

          {error() && <p class="error">{error()}</p>}

          {loading() && <p class="loading">Loading feed…</p>}

          <Show when={!loading()}>
            <Show
              when={posts().length > 0}
              fallback={
                <p class="empty">
                  {activeQuery()
                    ? "No results found."
                    : "No posts from followed blogs."}
                </p>
              }
            >
              <div
                class={view() === "grid" ? "feed feed-grid" : "feed"}
              >
                <For each={posts()}>
                  {(post) => (
                    <PostCard
                      post={post}
                      onTagClick={handleTagClick}
                      onImageClick={(url) =>
                        setLightboxUrl(upgradeToLightbox(url))
                      }
                    />
                  )}
                </For>
              </div>
            </Show>
          </Show>

          <button
            ref={loadMoreRef}
            onClick={loadMore}
            disabled={loadingMore()}
            class="btn-ghost"
            style="display:block;margin:24px auto"
          >
            {loadingMore() ? "Loading more" : "Load more"}
          </button>
        </main>
        <LightBox url={lightboxUrl()} onClose={() => setLightboxUrl(null)} />
      </div>
    </Show>
  );
}

