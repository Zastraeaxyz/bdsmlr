import { createSignal, createEffect, For, Show, untrack } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { useLocation, useNavigate, useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { Search, X } from "lucide-solid";
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
import { createMediaGallery } from "~/lib/mediaGallery";
import Header from "~/components/Header";
import SearchHelp from "~/components/SearchHelp";
import { LightBox } from "~/components/LightBox";
import SearchHistory from "~/components/SearchHistory";
import ViewDropdown from "~/components/ViewDropdown";
import { AutoLoadMore } from "~/components/AutoLoadMore";
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
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { EmptyState, FeedSkeleton } from "./FeedStates";

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
  const gallery = createMediaGallery({ posts: () => posts() });
  const [sortField, setSortField] = createSignal<number>(SortField.Date);
  const [sortOrder, setSortOrder] = createSignal<number>(SortOrder.Descending);
  const [view, setView] = createSignal<FeedView>(loadFeedView());
  let nextPageToken: string | null =
    typeof searchParams.page_token === "string" ? searchParams.page_token : null;
  let loadedKey = "";
  let searchPage = 1;
  let searchSession: string | null = null;
  let followedBlogIds: number[] = [];

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
    const loadKey = `${activeBlogId() ?? ""}|${activeQuery()}|${targetPage}`;
    const previousPosts = posts();
    setLoading(true);
    setLoadingMore(false);
    setError("");
    if (loadKey !== loadedKey) setPosts([]);
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
      loadedKey = loadKey;
    } catch (err: unknown) {
      // Keep the posts that were already on screen when a refresh fails, so a
      // rate limit does not wipe a feed the user is reading.
      if (loadKey === loadedKey) setPosts(previousPosts);
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
      <div class="flex min-h-dvh flex-col">
        <Header info="Following feed" />

        <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col">
          <div class="sticky top-14 z-30 space-y-2 border-b border-border bg-background/95 p-3 backdrop-blur">
            <form class="flex items-center gap-2" onSubmit={doSearch}>
              <div class="relative flex min-w-0 flex-1 items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
                <Search class="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
                <input
                  type="search"
                  inputMode="search"
                  class="h-10 w-full bg-transparent pl-8 pr-16 text-base outline-none placeholder:text-muted-foreground md:text-sm"
                  placeholder="Search posts…"
                  value={query()}
                  onInput={(event) => setQuery(event.currentTarget.value)}
                  aria-label="Search posts"
                />
                <div class="absolute right-1 flex items-center">
                  <Show when={activeQuery()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="size-8"
                      onClick={clearSearch}
                      aria-label="Clear search"
                    >
                      <X class="size-4" />
                    </Button>
                  </Show>
                  <SearchHistory
                    entries={history()}
                    onSelect={runSearch}
                    onDelete={(q) =>
                      setHistory(removeSearchHistory(HISTORY_KEY, q))
                    }
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="icon"
                class="size-10 shrink-0"
                aria-label="Search"

              >
                <Search class="size-4" />
              </Button>
              <SearchHelp onFill={runSearch} />
            </form>

            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
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
                <ViewDropdown
                  value={view()}
                  onChange={(value) => {
                    trackEvent("view-change", {
                      surface: "following",
                      view: value,
                    });
                    setView(value);
                    saveFeedView(value);
                  }}
                />
              </div>
              <Show when={activeQuery()}>
                <Badge variant="secondary" class="max-w-[55vw] truncate font-normal">
                  {activeQuery()}
                </Badge>
              </Show>
            </div>
          </div>

          <div class="flex flex-1 flex-col gap-2 py-2 sm:gap-3">
            <Show when={error()}>
              <div class="px-3">
                <FeedErrorNotice
                  message={error()}
                  onRetry={() => void fetchFeed(currentUrlPage())}
                />
              </div>
            </Show>

            <Show when={loading()}>
              <div class="px-3">
                <FeedSkeleton />
              </div>
            </Show>

            <Show when={!loading()}>
              <Show
                when={posts().length > 0}
                fallback={
                  <EmptyState title={activeQuery() ? "No results" : "Nothing here yet"}>
                    {activeQuery()
                      ? "No posts matched that search."
                      : "Follow some blogs to see their latest posts."}
                  </EmptyState>
                }
              >
                <div
                  class={
                    view() === "grid"
                      ? "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3"
                      : "flex flex-col gap-2 sm:gap-3"
                  }
                >
                  <For each={posts()}>
                    {(post) => (
                      <PostCard
                        post={post}
                        onTagClick={handleTagClick}
                        onImageClick={(url, postId) => gallery.open(url, postId)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </Show>

            <AutoLoadMore
              onLoad={() => {
                trackEvent("load-more", { surface: "following" });
                void loadMore();
              }}
              loading={loadingMore()}
              ready={!loading()}
            />
          </div>
        </main>
      </div>
      <LightBox gallery={gallery} />
    </Show>
  );
}
