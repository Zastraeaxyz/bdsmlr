import {
  createSignal,
  createEffect,
  createMemo,
  For,
  Show,
  onCleanup,
  onMount,
  untrack,
} from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import {
  resolveIdentifier,
  listBlogActivity,
  listBlogTopTags,
  searchPostsByTag,
  searchResultPosts,
  PostVariant,
  SortField,
  SortOrder,
  type Post,
  type TopTag,
} from "~/lib/api";
import { GearIcon, WarningIcon } from "~/components/Icons";
import SortDropdown, { sortOptionLabel } from "~/components/SortDropdown";
import { upgradeToLightbox } from "~/lib/sanitize";
import SearchHelp from "~/components/SearchHelp";
import { LightBox } from "~/components/LightBox";
import { useFeedSettings } from "~/lib/feedSettings";
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
import { freshPosts } from "~/lib/feedPagination";
import { findRepeatingImageIdentities } from "~/lib/repeatingImages";
import { countBucket, trackEvent } from "~/lib/analytics";

const PAGE_SIZE = 20;
const EMPTY_IMAGE_IDENTITIES: ReadonlySet<string> = new Set();

function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export default function UserFeed() {
  const params = useParams();
  const slug = () => params.user;
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = createSignal<Post[]>([]);
  const [topTags, setTopTags] = createSignal<TopTag[]>([]);
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
  const [lightboxUrl, setLightboxUrl] = createSignal<string | null>(null);
  const [showAllTags, setShowAllTags] = createSignal(false);
  const [sortField, setSortField] = createSignal(SortField.Date);
  const [sortOrder, setSortOrder] = createSignal(SortOrder.Descending);
  const [view, setView] = createSignal<FeedView>(loadFeedView());
  const {
    hideReblogs,
    setHideReblogs,
    hideRepeatingImages,
    setHideRepeatingImages,
  } = useFeedSettings();
  const [showSettings, setShowSettings] = createSignal(false);
  let settingsRef: HTMLDivElement | undefined;

  const historyKey = () => `bdsmlr:searchHistory:profile:${slug()}`;
  const [history, setHistory] = createSignal<string[]>([]);

  createEffect(() => {
    setHistory(loadSearchHistory(historyKey()));
  });

  const toggleHideReblogs = () => {
    const name = slug();
    if (!name) return;
    setHideReblogs((prev) => !prev);
    setShowSettings(false);
  };

  const toggleHideRepeatingImages = () => {
    setHideRepeatingImages((prev) => !prev);
    setShowSettings(false);
  };

  const repeatingImageIdentities = createMemo(() =>
    hideRepeatingImages()
      ? findRepeatingImageIdentities(posts())
      : EMPTY_IMAGE_IDENTITIES,
  );

  const activeTagName = () => {
    const match = activeQuery().trim().match(/^tag:(?:"([^"]+)"|(\S+))$/i);
    const tag = (match?.[1] ?? match?.[2] ?? "").trim();
    return tag || null;
  };

  const activeTagCount = () => {
    const tag = activeTagName();
    if (!tag) return null;
    const found = topTags().find(
      (entry) => entry.name.toLowerCase() === tag.toLowerCase(),
    );
    const value = Number(found?.postsCount);
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  const tagCountMismatch = () => {
    const count = activeTagCount();
    if (count == null || loading() || loadingMore() || error()) {
      return false;
    }
    if (posts().length >= count) return false;
    return !hasMore() || posts().length < PAGE_SIZE;
  };

  const emptyMessage = () => {
    if (!activeQuery()) return "No posts in feed.";
    const tag = activeTagName();
    const count = activeTagCount();
    if (tag && count != null) {
      return `No posts found for #${tag} in this blog. BDSMLR's tag counts are approximate: Top tags reports ${formatCount(count)}, but the blog search returned none.`;
    }
    return "No results found.";
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (settingsRef && !settingsRef.contains(e.target as Node)) {
      setShowSettings(false);
    }
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowSettings(false);
    }
  };

  onMount(() => {
    if (typeof document === "undefined") return;
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
  });

  onCleanup(() => {
    if (typeof document === "undefined") return;
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleKeydown);
  });

  let resolvedId: number | null = null;
  let nextPageToken: string | null = null;
  let searchPage = 1;
  let searchSession: string | null = null;
  let loadedIds = new Set<number>();
  let loadMoreRef: HTMLButtonElement | undefined;

  const requestSearch = (
    name: string,
    q: string,
    page: number,
    session: string | null,
  ) =>
    searchPostsByTag({
      tag_name: `blog:${name} ${q}`,
      sort_field: sortField(),
      order: sortOrder(),
      post_types: [1, 2, 3, 4, 5, 6, 7],
      variants: [1],
      page,
      ...(session ? { session } : {}),
      page_size: PAGE_SIZE,
    });

  let loadingPage = false;

  const loadPage = async (name: string, token?: string) => {
    if (loadingPage || !resolvedId) return;
    loadingPage = true;
    try {
      const data = await listBlogActivity({
        blog_id: resolvedId,
        blog_name: name,
        sort_field: sortField(),
        order: sortOrder(),
        post_types: [1, 2, 3, 4, 5, 6, 7],
        // "like"/"comment" are required: without them the server uses offset
        // pagination (result_offset) which loops forever on the same page.
        activity_kinds: ["post", "reblog", "like", "comment"],
        page: token
          ? { page_size: PAGE_SIZE, page_token: token }
          : { page_size: PAGE_SIZE },
        page_size: PAGE_SIZE,
      });
      if (data.error) {
        const msg =
          data.error === "blog not found" ? "Blog was banned" : data.error;
        throw new Error(msg);
      }
      // timelineItems type 1 = the blog's own posts + reblogs; type 2 =
      // like/comment activity clusters we don't show.
      const timelinePosts = (data.timelineItems ?? [])
        .filter((item) => item.type === 1 && item.post)
        .map((item) => item.post as Post);
      const fresh = timelinePosts.filter((post) => !loadedIds.has(post.id));
      if (fresh.length === 0) {
        nextPageToken = null;
        setHasMore(false);
        return;
      }
      for (const post of fresh) loadedIds.add(post.id);
      let incoming = fresh;
      if (hideReblogs()) {
        incoming = incoming.filter((p) => p.variant !== PostVariant.Reblog);
      }
      setPosts((prev) => [...prev, ...incoming]);
      nextPageToken = data.page?.nextPageToken ?? null;
      // The server keeps echoing a token after the last page, so also stop when
      // a page returns fewer posts than requested.
      if (!nextPageToken || timelinePosts.length < PAGE_SIZE) setHasMore(false);
    } finally {
      loadingPage = false;
    }
  };

  const currentUrlPage = () => {
    const page = Number(searchParams.page);
    return Number.isInteger(page) && page > 0 ? page : 1;
  };

  const currentUrlSession = () => (searchParams.session as string) || null;

  const fetchFeed = async (targetPage = 1) => {
    const name = slug();
    if (!name) {
      setError("No user specified");
      return;
    }
    setLoading(true);
    setLoadingMore(false);
    setError("");
    setPosts([]);
    setHasMore(true);
    resolvedId = null;
    nextPageToken = null;
    searchPage = 1;
    searchSession = null;
    loadedIds = new Set();
    try {
      const resolved = await resolveIdentifier(name);
      if (!resolved.blogId) {
        setError(resolved.error || "User not found");
        return;
      }
      resolvedId = resolved.blogId;
      const q = activeQuery();
      if (q) {
        const resumeSession = targetPage > 1 ? currentUrlSession() : null;
        searchSession = resumeSession;
        searchPage = targetPage;
        let data = await requestSearch(name, q, targetPage, resumeSession);
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
          data = await requestSearch(name, q, 1, null);
        }
        const incoming = searchResultPosts(data);
        setPosts(incoming);
        if (targetPage === 1) {
          trackEvent("search-results", {
            surface: "profile",
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
        await loadPage(name);
      }

      const tagsRes = await listBlogTopTags(name);
      setTopTags(tagsRes.tags ?? []);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  let lastFeedKey: string | undefined;
  createEffect(() => {
    const name = slug();
    const q = (searchParams.tag_name as string) || "";
    const key = `${name ?? ""}|${q}`;
    if (key === lastFeedKey) return;
    lastFeedKey = key;
    setQuery(q);
    setActiveQuery(q);
    untrack(() => fetchFeed(currentUrlPage()));
  });

  const loadMore = async () => {
    const name = slug();
    if (!name || !resolvedId || !hasMore() || loadingMore() || loading())
      return;
    setLoadingMore(true);
    try {
      const q = activeQuery();
      if (q) {
        if (!searchSession) {
          setHasMore(false);
          return;
        }
        const data = await requestSearch(name, q, searchPage, searchSession);
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
        if (
          data.hasMore === false ||
          (data.hasMore === undefined && incoming.length < PAGE_SIZE)
        )
          setHasMore(false);
        setSearchParams(
          {
            page: loadedPage > 1 ? loadedPage : undefined,
            session: searchSession ?? undefined,
          },
          { replace: true },
        );
        return;
      }
      if (!nextPageToken) return;
      const token = nextPageToken;
      nextPageToken = null;
      await loadPage(name, token);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  onMount(() => {
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
    const name = slug();
    if (!name) return;
    setHistory(addSearchHistory(historyKey(), q));
    const current = (searchParams.tag_name as string) || "";
    if (q === current) {
      fetchFeed(1);
      return;
    }
    setSearchParams({
      tag_name: q || undefined,
      page: undefined,
      session: undefined,
    });
  };

  const doSearch = (e: Event) => {
    e.preventDefault();
    const name = slug();
    if (!name) return;
    trackEvent("search", {
      surface: "profile",
      mode: query().trim() ? "query" : "clear",
    });
    runSearch(query());
  };

  const clearSearch = () => {
    const name = slug();
    if (!name) return;
    trackEvent("search", { surface: "profile", mode: "clear" });
    runSearch("");
  };

  const tagQuery = (tag: string) =>
    (query() ? query() + " " : "") +
    `tag:${tag.includes(" ") ? `"${tag}"` : tag}`;

  const tagHref = (tag: string) => {
    const name = slug();
    if (!name) return "#";
    return `/${name}?tag_name=${encodeURIComponent(tagQuery(tag))}`;
  };

  const handleTagClick = (tag: string) => {
    if (!slug()) return;
    runSearch(tagQuery(tag));
  };

  const tagAnchorClick = (e: MouseEvent, tag: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    trackEvent("tag-click", { surface: "profile" });
    handleTagClick(tag);
  };

  return (
    <>
      {topTags().length > 0 && (
        <section class="top-tags">
          <div class="top-tags-inner">
            <span
              class="top-tags-label"
              title="BDSMLR tag counts are approximate and may not match blog search results."
            >
              Top tags
            </span>
            <div class="top-tags-list">
              <For each={topTags().slice(0, 5)}>
                {(t) => (
                  <a
                    href={tagHref(t.name)}
                    class="tag"
                    title="BDSMLR tag counts are approximate and may not match blog search results."
                    onClick={(e) => tagAnchorClick(e, t.name)}
                  >
                    <span class="tag-name">{t.name}</span>
                    <span class="tag-count">{t.postsCount}</span>
                  </a>
                )}
              </For>
              {topTags().length > 5 && (
                <button
                  type="button"
                  class="tag"
                  onClick={() => setShowAllTags(true)}
                >
                  Show all ({topTags().length - 5})
                </button>
              )}
            </div>
          </div>
        </section>
      )}
      <Show when={showAllTags()}>
        <div
          class="tag-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAllTags(false);
          }}
        >
          <div class="tag-modal" tabIndex={0}>
            <button
              type="button"
              class="tag-modal-close"
              onClick={() => setShowAllTags(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3>All tags</h3>
            <div class="tag-modal-list">
              <For each={topTags().slice(5)}>
                {(t) => (
                  <a
                    href={tagHref(t.name)}
                    class="tag"
                    title="BDSMLR tag counts are approximate and may not match blog search results."
                    onClick={(e) => {
                      if (
                        e.metaKey ||
                        e.ctrlKey ||
                        e.shiftKey ||
                        e.altKey ||
                        e.button !== 0
                      ) {
                        return;
                      }
                      e.preventDefault();
                      trackEvent("tag-click", { surface: "profile" });
                      handleTagClick(t.name);
                      setShowAllTags(false);
                    }}
                  >
                    <span class="tag-name">{t.name}</span>
                    <span class="tag-count">{t.postsCount}</span>
                  </a>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
      <main>
        <form class="search-bar" onSubmit={doSearch}>
          <SortDropdown
            value={`${sortField()}-${sortOrder()}`}
            onChange={(sf, so) => {
              trackEvent("sort-change", {
                surface: "profile",
                sort: sortOptionLabel(sf, so),
              });
              setSortField(sf);
              setSortOrder(so);
              nextPageToken = null;
              searchPage = 1;
              searchSession = null;
              setPosts([]);
              setHasMore(true);
              if (activeQuery()) {
                setSearchParams({ page: undefined, session: undefined });
                fetchFeed(1);
                return;
              }
              const name = slug();
              if (name) loadPage(name);
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
                setHistory(removeSearchHistory(historyKey(), q))
              }
            />
          </div>
          <button type="submit">Search</button>
          <SearchHelp onFill={runSearch} />
          <div class="settings-dropdown" ref={settingsRef}>
            <button
              type="button"
              class="settings-btn"
              onClick={() => setShowSettings(!showSettings())}
              aria-label="Settings"
              aria-expanded={showSettings()}
            >
              <GearIcon />
            </button>
            <Show when={showSettings()}>
              <div class="settings-dropdown-menu">
                <label class="settings-dropdown-item">
                  <input
                    type="checkbox"
                    checked={hideReblogs()}
                    onChange={toggleHideReblogs}
                  />
                  Hide reblogs
                </label>
                <label
                  class="settings-dropdown-item"
                  title="BDSMLR sometimes repeats the same images in many posts, such as on the Rectrix blog. This hides images shared by the three most recent image posts."
                >
                  <input
                    type="checkbox"
                    checked={hideRepeatingImages()}
                    onChange={toggleHideRepeatingImages}
                  />
                  Hide repeating images
                </label>
              </div>
            </Show>
          </div>
          <ViewDropdown
            value={view()}
            onChange={(v) => {
              trackEvent("view-change", { surface: "profile", view: v });
              setView(v);
              saveFeedView(v);
            }}
          />
        </form>

        {error() && <p class="error">{error()}</p>}

        {loading() && <p class="loading">Loading feed…</p>}

        <Show when={tagCountMismatch() && posts().length > 0}>
          <div class="tag-count-notice">
            <WarningIcon />
            <p>
              BDSMLR's tag counts are approximate. Top tags reports{" "}
              {formatCount(activeTagCount()!)} posts for #{activeTagName()}, but
              this blog search returned {formatCount(posts().length)}. The tag
              index can be stale or broader than the blog search.
            </p>
          </div>
        </Show>

        <Show when={!loading()}>
          <Show
            when={posts().length > 0}
            fallback={<p class="empty">{emptyMessage()}</p>}
          >
            <div
              class={view() === "grid" ? "feed feed-grid" : "feed"}
            >
              <For each={posts()}>
                {(post) => (
                  <PostCard
                    post={post}
                    hiddenImageIdentities={repeatingImageIdentities()}
                    onTagClick={handleTagClick}
                    tagHref={tagHref}
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
    </>
  );
}

