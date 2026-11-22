import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { A, useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { Page, PageHeader } from "~/components/Page";
import { FeedSkeleton, EmptyState } from "~/components/FeedStates";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Search } from "lucide-solid";
import { BlogCard } from "~/components/BlogCard";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { searchBlogs, blogTagAffinity, type Blog, type TagAffinityItem } from "~/lib/api";
import { useAuth } from "~/lib/useAuth";
import { tagSearchHref } from "~/lib/tagLinks";
import { countBucket, trackEvent } from "~/lib/analytics";

const PAGE_SIZE = 20;

export default function BlogSearchPage() {
  const { user, activeBlog } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [affinity, setAffinity] = createSignal<TagAffinityItem[]>([]);
  const [query, setQuery] = createSignal((searchParams.q as string) || "");
  const [blogs, setBlogs] = createSignal<Blog[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [nextPageToken, setNextPageToken] = createSignal<string | null>(null);

  const activeQuery = () => ((searchParams.q as string) || "").trim();

  createEffect(() => {
    setQuery((searchParams.q as string) || "");
  });

  createEffect(() => {
    const blog = activeBlog();
    setAffinity([]);
    if (!user() || !blog) return;
    let cancelled = false;
    blogTagAffinity(blog.name)
      .then((data) => {
        if (cancelled) return;
        setAffinity((data.tagAffinity?.all?.likes ?? []).slice(0, 12));
      })
      .catch(() => {
        if (!cancelled) setAffinity([]);
      });
    onCleanup(() => {
      cancelled = true;
    });
  });

  const run = async (q: string, token?: string) => {
    if (!q) {
      setBlogs([]);
      setNextPageToken(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await searchBlogs(q, PAGE_SIZE, token);
      const incoming = data.blogs ?? [];
      if (!token) {
        trackEvent("search-results", {
          surface: "blogs",
          count: countBucket(incoming.length),
        });
      }
      setBlogs((prev) => (token ? [...prev, ...incoming] : incoming));
      setNextPageToken(data.page?.nextPageToken ?? null);
      if (incoming.length < PAGE_SIZE) setNextPageToken(null);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Blog search failed");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    const q = activeQuery();
    setNextPageToken(null);
    setBlogs([]);
    void run(q);
  });

  const submit = (e: Event) => {
    e.preventDefault();
    const q = query().trim();
    trackEvent("search", {
      surface: "blogs",
      mode: q ? "query" : "clear",
    });
    setSearchParams({ q: q || undefined }, { replace: true });
  };

  const loadMore = () => {
    const token = nextPageToken();
    if (!token || loading()) return;
    void run(activeQuery(), token);
  };

  return (
    <Page info="Blog search">
      <Title>Blog search - bbdsmlr</Title>
      <PageHeader
        title="Blog search"
        description="Find blogs by name, title, or description."
      />

      <Show when={affinity().length > 0}>
        <section class="mb-4">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tag affinity
            </span>
            <span class="text-xs text-muted-foreground">
              from posts you liked
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <For each={affinity()}>
              {(item) => (
                <Show when={item.tag}>
                  <A
                    href={tagSearchHref(item.tag!)}
                    title={`Search posts tagged ${item.tag}`}
                    onClick={() => trackEvent("tag-click", { surface: "blog-search" })}
                  >
                    <Badge variant="secondary" class="gap-1.5 font-normal">
                      {item.tag}
                      <span class="text-muted-foreground">{item.count ?? 0}</span>
                    </Badge>
                  </A>
                </Show>
              )}
            </For>
          </div>
        </section>
      </Show>


      <form class="mb-4 flex items-center gap-2" onSubmit={submit}>
        <div class="relative flex min-w-0 flex-1 items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/40">
          <Search class="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
          <input
            type="search"
            class="h-10 w-full bg-transparent pl-8 pr-3 text-base outline-none placeholder:text-muted-foreground md:text-sm"
            placeholder="Search blogs…"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
            aria-label="Search blogs"

          />
        </div>
        <Button type="submit" class="h-10 shrink-0">
          Search
        </Button>
      </form>

      <Show when={!activeQuery()}>
        <EmptyState title="Search blogs">Enter a query to search blogs.</EmptyState>
      </Show>

      <Show when={error()}>
        <FeedErrorNotice message={error()} />
      </Show>

      <Show when={loading()}>
        <FeedSkeleton count={3} />
      </Show>

      <Show when={activeQuery() && !loading()}>
        <Show
          when={blogs().length > 0}
          fallback={<EmptyState title="No blogs found">Try a different query.</EmptyState>}
        >
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <For each={blogs()}>
              {(blog) => <BlogCard blog={blog} />}
            </For>
          </div>
        </Show>
      </Show>

      <Show when={nextPageToken()}>
        <AutoLoadMore
          onLoad={loadMore}
          loading={loading()}
          label="Load more blogs"
        />
      </Show>
    </Page>
  );
}
