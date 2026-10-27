import { createSignal, createEffect, For, Show, onCleanup, untrack } from "solid-js";
import { useLocation, useNavigate, useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import {
  listBlogsRecentActivity,
  searchPostsByTag,
  searchResultPosts,
  PostType,
  SortField,
  SortOrder,
  type Post,
} from "~/lib/api";
import {
  fetchAllFollowingIds,
  getCachedFollowingIds,
  setCachedFollowingIds,
} from "~/lib/following";
import { freshPosts } from "~/lib/feedPagination";
import { useAuth } from "~/lib/useAuth";
import SortDropdown, { sortOptionLabel } from "~/components/SortDropdown";
import { upgradeToLightbox } from "~/lib/sanitize";
import Header from "~/components/Header";
import SearchHelp from "~/components/SearchHelp";
import { LightBox } from "~/components/LightBox";
import SearchHistory from "~/components/SearchHistory";
import ViewDropdown from "~/components/ViewDropdown";
import { PostCard } from "~/components/PostCard";
import { countBucket, trackEvent } from "~/lib/analytics";
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

export default function HomeFeed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, activeBlogId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  createEffect(() => {
    if (!authLoading() && !user() && location.pathname !== "/") {
      navigate("/login", { replace: true });
    }
  });

  const [posts, setPosts] = createSignal<Post[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);
  const [error, setError] = createSignal("");
  const [query, setQuery] = createSignal(
    (searchParams.tag_name as string) || "",
  );
  const [activeQuery, setActiveQuery] = createSignal(
    (searchParams.tag_name as string) || "",
  );
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

  const requestSearch = (q: string, page: number, session: string | null) =>
    searchPostsByTag({
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
      page,
      ...(session ? { session } : {}),
      page_size: PAGE_SIZE,
    });

  const syncUrl = () => {
    setSearchParams(
      { page_token: nextPageToken || undefined },
      { replace: true },
    );
  };

  const currentUrlPage = () => {
    const page = Number(searchParams.page);
    return Number.isInteger(page) && page > 0 ? page : 1;
  };

  const currentUrlSession = () => (searchParams.session as string) || null;

  const fetchFeed = async (targetPage = 1) => {
    if (!user() || !activeBlogId()) {
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
        const resumeSession = targetPage > 1 ? currentUrlSession() : null;
        searchSession = resumeSession;
        searchPage = targetPage;
        let data = await requestSearch(q, targetPage, resumeSession);
        for (
          let attempt = 0;
          targetPage === 1 &&
          attempt < 4 &&
          searchResultPosts(data).length === 0 &&
          data.hasMore &&
          data.searchStatus === "warming";
          attempt++
        ) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          data = await requestSearch(q, 1, null);
        }
        const incoming = searchResultPosts(data);
        setPosts(incoming);
        if (targetPage === 1) {
          trackEvent("search-results", {
            surface: "following",
            count: countBucket(incoming.length),
          });
        }
        searchSession = data.sessionId ?? resumeSession;
        searchPage = targetPage + 1;
        if (
          data.hasMore === false ||
          (data.hasMore === undefined && incoming.length < PAGE_SIZE)
        )
          setHasMore(false);
        if (
          targetPage > 1 &&
          searchSession &&
          searchSession !== currentUrlSession()
        )
          setSearchParams({ session: searchSession }, { replace: true });
      } else {
        const actorId = activeBlogId();
        followedBlogIds = getCachedFollowingIds(actorId);
        if (followedBlogIds.length === 0 && actorId) {
          try {
            followedBlogIds = await fetchAllFollowingIds(actorId);
            setCachedFollowingIds(followedBlogIds, actorId);
          } catch {}
        }
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

  let lastFeedKey: string | undefined;
  createEffect(() => {
    if (authLoading()) return;
    const blogId = activeBlogId();
    const q = (searchParams.tag_name as string) || "";
    const key = `${blogId ?? ""}|${q}`;
    if (key === lastFeedKey) return;
    lastFeedKey = key;
    setQuery(q);
    setActiveQuery(q);
    nextPageToken = (searchParams.page_token as string) || null;
    if (blogId) untrack(() => fetchFeed(currentUrlPage()));
  });

  const loadMore = async () => {
    if (!hasMore() || loadingMore() || loading()) return;
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
        const data = await requestSearch(q, searchPage, searchSession);
        const incoming = searchResultPosts(data);
        const fresh = freshPosts(posts(), incoming);
        if (fresh.length === 0) {
          setHasMore(false);
          return;
        }
        setPosts((prev) => [...prev, ...fresh]);
        searchSession = data.sessionId ?? searchSession;
        const loadedPage = searchPage;
        searchPage++;
        if (data.hasMore === false || (data.hasMore === undefined && incoming.length < PAGE_SIZE))
          setHasMore(false);
        setSearchParams(
          {
            page: loadedPage > 1 ? loadedPage : undefined,
            session: searchSession ?? undefined,
          },
          { replace: true },
        );
      } else {
        if (followedBlogIds.length === 0 || !token) return;
        const data = await listBlogsRecentActivity(
          followedBlogIds,
          PAGE_SIZE,
          token,
        );
        const incoming = data.posts ?? [];
        const fresh = freshPosts(posts(), incoming);
        if (fresh.length === 0) {
          setHasMore(false);
          syncUrl();
          return;
        }
        setPosts((prev) => [...prev, ...fresh]);
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
    setHistory(addSearchHistory(HISTORY_KEY, q));
    const current = (searchParams.tag_name as string) || "";
    if (q === current) {
      nextPageToken = null;
      fetchFeed(1);
      return;
    }
    setSearchParams({
      tag_name: q || undefined,
      page: undefined,
      session: undefined,
      page_token: undefined,
    });
  };

  const doSearch = (e: Event) => {
    e.preventDefault();
    trackEvent("search", {
      surface: "following",
      mode: query().trim() ? "query" : "clear",
    });
    runSearch(query());
  };

  const clearSearch = () => {
    trackEvent("search", { surface: "following", mode: "clear" });
    runSearch("");
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
                trackEvent("sort-change", {
                  surface: "following",
                  sort: sortOptionLabel(sf, so),
                });
                setSortField(sf);
                setSortOrder(so);
                nextPageToken = null;
                if (activeQuery())
                  setSearchParams({ page: undefined, session: undefined });
                fetchFeed(1);
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
                trackEvent("view-change", { surface: "following", view: v });
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
            onClick={() => {
              trackEvent("load-more", { surface: "following" });
              void loadMore();
            }}
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
