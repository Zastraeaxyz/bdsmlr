import { createEffect, createSignal, For, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { BlogCard } from "~/components/BlogCard";
import { PostSearchResults } from "~/components/PostSearchResults";
import SearchHelp from "~/components/SearchHelp";
import { searchBlogs, type Blog } from "~/lib/api";

const PAGE_SIZE = 20;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = createSignal((searchParams.q as string) || "");
  const [blogs, setBlogs] = createSignal<Blog[]>([]);
  const [loadingBlogs, setLoadingBlogs] = createSignal(false);
  const [blogError, setBlogError] = createSignal("");
  let nextBlogToken: string | null = null;

  const type = () => (searchParams.type === "blogs" ? "blogs" : "posts");
  const activeQuery = () => ((searchParams.q as string) || "").trim();

  createEffect(() => {
    setQuery((searchParams.q as string) || "");
  });

  const runBlogs = async (q: string, token?: string) => {
    if (!q) {
      setBlogs([]);
      setLoadingBlogs(false);
      return;
    }
    setLoadingBlogs(true);
    setBlogError("");
    try {
      const data = await searchBlogs(q, PAGE_SIZE, token);
      const incoming = data.blogs ?? [];
      setBlogs((prev) => (token ? [...prev, ...incoming] : incoming));
      nextBlogToken = data.page?.nextPageToken ?? null;
      if (incoming.length < PAGE_SIZE) nextBlogToken = null;
    } catch (err: unknown) {
      setBlogError((err as Error)?.message || "Blog search failed");
    } finally {
      setLoadingBlogs(false);
    }
  };

  createEffect(() => {
    type();
    activeQuery();
    if (type() === "blogs") {
      nextBlogToken = null;
      setBlogs([]);
      void runBlogs(activeQuery());
    }
  });

  const submit = (e: Event) => {
    e.preventDefault();
    const q = query().trim();
    setSearchParams({ type: type(), q: q || undefined }, { replace: true });
  };

  const switchType = (next: "posts" | "blogs") => {
    setSearchParams(
      { type: next, q: activeQuery() || undefined },
      { replace: true },
    );
  };

  const loadMoreBlogs = () => {
    if (!nextBlogToken || loadingBlogs()) return;
    void runBlogs(activeQuery(), nextBlogToken);
  };

  return (
    <div class="home-page">
      <Title>Search - bbdsmlr</Title>
      <Header info="Search" />
      <main>
        <div class="search-tabs">
          <button
            type="button"
            class={type() === "posts" ? "search-tab active" : "search-tab"}
            onClick={() => switchType("posts")}
          >
            Posts
          </button>
          <button
            type="button"
            class={type() === "blogs" ? "search-tab active" : "search-tab"}
            onClick={() => switchType("blogs")}
          >
            Blogs
          </button>
        </div>
        <form class="search-bar" onSubmit={submit}>
          <div class="search-input-wrap">
            <input
              type="text"
              placeholder={type() === "blogs" ? "Search blogs…" : "Search posts…"}
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
          </div>
          <button type="submit">Search</button>
          <SearchHelp
            onFill={(q) => {
              setQuery(q);
              setSearchParams({ type: type(), q }, { replace: true });
            }}
          />
        </form>

        <Show when={!activeQuery()}>
          <p class="empty">Enter a query to search.</p>
        </Show>

        <Show when={activeQuery() && type() === "posts"}>
          <PostSearchResults query={activeQuery()} />
        </Show>

        <Show when={activeQuery() && type() === "blogs"}>
          {blogError() && <p class="error">{blogError()}</p>}
          {loadingBlogs() && <p class="loading">Searching blogs…</p>}
          <Show when={!loadingBlogs()}>
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
          <Show when={nextBlogToken}>
            <button
              type="button"
              class="btn-ghost"
              style="display:block;margin:24px auto"
              onClick={loadMoreBlogs}
              disabled={loadingBlogs()}
            >
              {loadingBlogs() ? "Loading more" : "Load more blogs"}
            </button>
          </Show>
        </Show>
      </main>
    </div>
  );
}
