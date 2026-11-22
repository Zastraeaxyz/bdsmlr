import {
  createSignal,
  createEffect,
  createMemo,
  For,
  Show,
  untrack,
} from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import {
  AlertTriangle,
  Settings,
  X,
} from "lucide-solid";
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
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import SortDropdown, { sortOptionLabel } from "~/components/SortDropdown";
import { createMediaGallery } from "~/lib/mediaGallery";
import SearchHelp from "~/components/SearchHelp";
import { LightBox } from "~/components/LightBox";
import { useFeedSettings } from "~/lib/feedSettings";
import SearchHistory from "~/components/SearchHistory";
import ViewDropdown from "~/components/ViewDropdown";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { PostCard } from "~/components/PostCard";
import { FeedSkeleton, EmptyState } from "~/components/FeedStates";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Checkbox,
  CheckboxControl,
  CheckboxInput,
  CheckboxLabel,
} from "~/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "~/components/ui/popover";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
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
import { pendingReblogsFor, prunePendingReblogs } from "~/lib/pendingReblogs";
import { countBucket, trackEvent } from "~/lib/analytics";
import { cx } from "~/lib/cva";

const PAGE_SIZE = 20;
const EMPTY_IMAGE_IDENTITIES: ReadonlySet<string> = new Set();

const TAG_COUNT_WARNING =
  "BDSMLR tag counts are approximate and may not match blog search results.";

const SETTINGS_TRIGGER_CLASS = "size-11 shrink-0 sm:size-9";

const TAG_LINK_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm text-primary transition-colors outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-ring";

const TAG_COUNT_CLASS = "text-xs font-medium text-muted-foreground";

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
  const [showAllTags, setShowAllTags] = createSignal(false);
  const [sortField, setSortField] = createSignal<number>(SortField.Date);
  const [sortOrder, setSortOrder] = createSignal<number>(SortOrder.Descending);
  const [view, setView] = createSignal<FeedView>(loadFeedView());
  const {
    hideReblogs,
    setHideReblogs,
    hideRepeatingImages,
    setHideRepeatingImages,
  } = useFeedSettings();
  const historyKey = () => `bdsmlr:searchHistory:profile:${slug()}`;
  const [history, setHistory] = createSignal<string[]>([]);

  createEffect(() => {
    setHistory(loadSearchHistory(historyKey()));
  });

  const toggleHideReblogs = () => {
    if (!slug()) return;
    setHideReblogs((prev) => !prev);
  };

  const toggleHideRepeatingImages = () => {
    setHideRepeatingImages((prev) => !prev);
  };

  const repeatingImageIdentities = createMemo(() =>
    hideRepeatingImages()
      ? findRepeatingImageIdentities(posts())
      : EMPTY_IMAGE_IDENTITIES,
  );

  const gallery = createMediaGallery({
    posts: () => posts(),
    hiddenImageIdentities: () => repeatingImageIdentities(),
  });

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
    if (!activeQuery()) {
      return "No posts in feed.";
    }
    const tag = activeTagName();
    const count = activeTagCount();
    if (tag && count != null) {
      return `No posts found for #${tag} in this blog. BDSMLR's tag counts are approximate: Top tags reports ${formatCount(count)}, but the blog search returned none.`;
    }
    return "No results found.";
  };

  let resolvedId: number | null = null;
  let nextPageToken: string | null = null;
  let searchPage = 1;
  let searchSession: string | null = null;
  let loadedIds = new Set<number>();
  let lastFeedKey: string | undefined;

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

  const loadPage = async (name: string, token?: string): Promise<number> => {
    if (loadingPage || !resolvedId) return 0;
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
        return 0;
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
      return fresh.length;
    } finally {
      loadingPage = false;
    }
  };

  const currentUrlPage = () => {
    const page = Number(searchParams.page);
    return Number.isInteger(page) && page > 0 ? page : 1;
  };

  const currentUrlSession = () => (searchParams.session as string) || null;

  const feedKeyFor = (name: string | undefined, q: string) =>
    `${name ?? ""}|${q}`;

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
      if (resolvedId && !activeQuery() && !hideReblogs()) {
        prunePendingReblogs(posts());
        const pending = pendingReblogsFor(resolvedId).filter(
          (post) => !loadedIds.has(post.id),
        );
        if (pending.length > 0) {
          for (const post of pending) loadedIds.add(post.id);
          setPosts((prev) => [...pending, ...prev]);
        }
      }
      setLoading(false);
    }
  };

  createEffect(() => {
    const name = slug();
    const q = (searchParams.tag_name as string) || "";
    const key = feedKeyFor(name, q);
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

  const feedClass = () =>
    view() === "grid"
      ? "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3"
      : "flex flex-col gap-2 sm:gap-3";

  return (
    <>
      <Show when={topTags().length > 0}>
        <section class="border-b border-border bg-card">
          <div class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-3">
            <span
              class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              title={TAG_COUNT_WARNING}
            >
              Top tags
            </span>
            <div class="flex flex-wrap items-center gap-1.5">
              <For each={topTags().slice(0, 5)}>
                {(t) => (
                  <a
                    href={tagHref(t.name)}
                    class={TAG_LINK_CLASS}
                    title={TAG_COUNT_WARNING}
                    onClick={(e) => tagAnchorClick(e, t.name)}
                  >
                    <span>{t.name}</span>
                    <span class={TAG_COUNT_CLASS}>{t.postsCount}</span>
                  </a>
                )}
              </For>
              <Show when={topTags().length > 5}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-11 rounded-full sm:h-8"
                  onClick={() => setShowAllTags(true)}
                >
                  Show all ({topTags().length - 5})
                </Button>
              </Show>
            </div>
          </div>
        </section>
      </Show>
      <Dialog
        open={showAllTags()}
        onOpenChange={(open) => setShowAllTags(open)}
      >
        <DialogPortal>
          <DialogContent class="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>All tags</DialogTitle>
            </DialogHeader>
            <div class="max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
              <For each={topTags().slice(5)}>
                {(t) => (
                  <a
                    href={tagHref(t.name)}
                    class={cx(TAG_LINK_CLASS, "w-full justify-between")}
                    title={TAG_COUNT_WARNING}
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
                    <span class="min-w-0 truncate">{t.name}</span>
                    <Badge variant="secondary" class="font-normal">
                      {t.postsCount}
                    </Badge>
                  </a>
                )}
              </For>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
      <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 py-4 sm:px-4">
        <form class="mb-3 flex flex-col gap-2" onSubmit={doSearch}>
          <div class="flex items-center gap-2">
            <div class="relative min-w-0 flex-1">
              <TextField>
                <TextFieldInput
                  type="text"
                  placeholder="Search posts…"
                  aria-label="Search posts"
                  class="h-11 pr-10"
                  value={query()}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                />
              </TextField>
              <Show when={activeQuery()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="absolute top-1/2 right-0.5 size-9 -translate-y-1/2"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  <X class="size-4" />
                </Button>
              </Show>
            </div>
            <Button type="submit" class="h-11 px-4">
              Search
            </Button>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
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
            <SearchHistory
              entries={history()}
              onSelect={runSearch}
              onDelete={(q) =>
                setHistory(removeSearchHistory(historyKey(), q))
              }
            />
            <SearchHelp onFill={runSearch} />
            <Popover>
              <PopoverTrigger<typeof Button>
                as={(triggerProps) => (
                  <Button
                    {...triggerProps}
                    type="button"
                    variant="outline"
                    size="icon"
                    class={SETTINGS_TRIGGER_CLASS}
                    aria-label="Feed settings"
                  >
                    <Settings class="size-4" />
                  </Button>
                )}
              />
              <PopoverPortal>
                <PopoverContent class="w-60 p-3">
                  <p class="mb-1 text-sm font-semibold">Feed settings</p>
                  <div class="flex flex-col gap-1">
                    <Checkbox
                      checked={hideReblogs()}
                      onChange={() => toggleHideReblogs()}
                      class="flex min-h-11 items-center gap-2 rounded-md px-1 hover:bg-accent"
                    >
                      <CheckboxInput />
                      <CheckboxControl />
                      <CheckboxLabel class="text-sm font-normal">
                        Hide reblogs
                      </CheckboxLabel>
                    </Checkbox>
                    <Checkbox
                      checked={hideRepeatingImages()}
                      onChange={() => toggleHideRepeatingImages()}
                      class="flex min-h-11 items-center gap-2 rounded-md px-1 hover:bg-accent"
                      title="BDSMLR sometimes repeats the same images in many posts, such as on the Rectrix blog. This hides images shared by the three most recent image posts."
                    >
                      <CheckboxInput />
                      <CheckboxControl />
                      <CheckboxLabel class="text-sm font-normal">
                        Hide repeating images
                      </CheckboxLabel>
                    </Checkbox>
                  </div>
                </PopoverContent>
              </PopoverPortal>
            </Popover>
            <div class="ml-auto">
              <ViewDropdown
                value={view()}
                onChange={(v) => {
                  trackEvent("view-change", { surface: "profile", view: v });
                  setView(v);
                  saveFeedView(v);
                }}
              />
            </div>
          </div>
        </form>


        <Show when={error()}>
          <FeedErrorNotice
            message={error()}
            blogName={slug()}
            onRetry={() => void fetchFeed(searchPage)}
          />
        </Show>

        <Show when={loading()}>
          <FeedSkeleton />
        </Show>

        <Show when={tagCountMismatch() && posts().length > 0}>
          <div class="mb-3">
            <div class="flex items-start gap-2.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
              <AlertTriangle class="mt-0.5 size-4 shrink-0" />
              <p>
                BDSMLR's tag counts are approximate. Top tags reports{" "}
                {formatCount(activeTagCount()!)} posts for #{activeTagName()},
                but this blog search returned {formatCount(posts().length)}. The
                tag index can be stale or broader than the blog search.
              </p>
            </div>
          </div>
        </Show>

        <Show when={!loading()}>
          <Show
            when={posts().length > 0}
            fallback={<EmptyState>{emptyMessage()}</EmptyState>}
          >
            <div class={feedClass()}>
              <For each={posts()}>
                {(post) => (
                  <PostCard
                    post={post}
                    hiddenImageIdentities={repeatingImageIdentities()}
                    onTagClick={handleTagClick}
                    tagHref={tagHref}
                    onImageClick={(url, postId) => gallery.open(url, postId)}
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>

        <AutoLoadMore
          onLoad={() => {
            trackEvent("load-more", { surface: "profile" });
            void loadMore();
          }}
          loading={loadingMore()}
          ready={!loading()}
        />
      </main>
      <LightBox gallery={gallery} />
    </>
  );
}
