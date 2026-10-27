import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { A, useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
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
    <div class="home-page">
      <Title>Blog search - bbdsmlr</Title>
      <Header info="Blog search" />
      <Show when={affinity().length > 0}>
        <section class="top-tags">
          <div class="top-tags-inner">
            <span
              class="top-tags-label"
              title="Tags from posts you liked."
            >
              Tag affinity
            </span>
            <div class="top-tags-list">
              <For each={affinity()}>
                {(item) => (
                  <Show when={item.tag}>
                    <A
                      href={tagSearchHref(item.tag!)}
                      class="tag"
                      title={`Search posts tagged ${item.tag}`}
                      onClick={() => trackEvent("tag-click", { surface: "blog-search" })}
                    >
                      <span class="tag-name">{item.tag}</span>
                      <span class="tag-count">{item.count ?? 0}</span>
                    </A>
                  </Show>
                )}
              </For>
            </div>
          </div>
        </section>
      </Show>
      <main>
        <form class="search-bar" onSubmit={submit}>
          <div class="search-input-wrap">
            <input
              type="text"
              placeholder="Search blogs…"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
          </div>
          <button type="submit">Search</button>
        </form>

        <Show when={!activeQuery()}>
          <p class="empty">Enter a query to search blogs.</p>
        </Show>

        {error() && <p class="error">{error()}</p>}
        {loading() && <p class="loading">Searching blogs…</p>}
        <Show when={activeQuery() && !loading()}>
          <Show
            when={blogs().length > 0}
            fallback={<p class="empty">No blogs found.</p>}
          >
            <div class="blog-card-grid">
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
      </main>
    </div>
  );
}
