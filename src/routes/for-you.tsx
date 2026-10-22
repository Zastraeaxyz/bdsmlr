import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { PostCard } from "~/components/PostCard";
import { BlogCard } from "~/components/BlogCard";
import { LightBox } from "~/components/LightBox";
import { useAuth } from "~/lib/useAuth";
import {
  forYou,
  listRecommendedBlogs,
  type Blog,
  type Post,
} from "~/lib/api";
import { upgradeToLightbox } from "~/lib/sanitize";

const PAGE_SIZE = 20;

export default function ForYouPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, activeBlog } = useAuth();
  const [posts, setPosts] = createSignal<Post[]>([]);
  const [blogs, setBlogs] = createSignal<Blog[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const [lightboxUrl, setLightboxUrl] = createSignal<string | null>(null);
  let nextPageToken: string | null = null;

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  const loadRecommended = async (blogName: string) => {
    try {
      const data = await listRecommendedBlogs(blogName, 12);
      setBlogs(data.blogs ?? []);
    } catch {
      setBlogs([]);
    }
  };

  const load = async () => {
    const blog = activeBlog();
    if (!blog) {
      setError("Sign in to see your For You feed.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setPosts([]);
    nextPageToken = null;
    try {
      const data = await forYou(blog.name, PAGE_SIZE);
      const incoming = data.posts ?? [];
      setPosts(incoming);
      nextPageToken = data.page?.nextPageToken ?? null;
      void loadRecommended(blog.name);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load For You");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (authLoading() || !user()) return;
    activeBlog()?.name;
    void load();
  });

  const loadMore = async () => {
    const blog = activeBlog();
    if (!blog || !nextPageToken || loadingMore()) return;
    setLoadingMore(true);
    const token = nextPageToken;
    try {
      const data = await forYou(blog.name, PAGE_SIZE, token);
      const incoming = data.posts ?? [];
      setPosts((prev) => [...prev, ...incoming]);
      nextPageToken = data.page?.nextPageToken ?? null;
      if (incoming.length < PAGE_SIZE) nextPageToken = null;
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load more posts");
    } finally {
      setLoadingMore(false);
    }
  };

  const openTag = (tag: string) => {
    navigate(`/tag/${encodeURIComponent(tag)}`);
  };

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Title>For you - bbdsmlr</Title>
      <div class="home-page">
        <Header info="For you" />
        <main>
          <Show when={blogs().length > 0}>
            <section class="recommended-section">
              <h2 class="section-title">Recommended blogs</h2>
              <div class="blog-card-row">
                <For each={blogs()}>
                  {(blog) => <BlogCard blog={blog} />}
                </For>
              </div>
            </section>
          </Show>

          <h2 class="section-title">For you</h2>
          {error() && <p class="error">{error()}</p>}
          {loading() && <p class="loading">Loading posts…</p>}
          <Show when={!loading()}>
            <Show
              when={posts().length > 0}
              fallback={<p class="empty">No recommendations yet.</p>}
            >
              <div class="feed">
                <For each={posts()}>
                  {(post) => (
                    <PostCard
                      post={post}
                      onTagClick={openTag}
                      onImageClick={(url) =>
                        setLightboxUrl(upgradeToLightbox(url))
                      }
                    />
                  )}
                </For>
              </div>
            </Show>
          </Show>
          <Show when={nextPageToken}>
            <button
              type="button"
              class="btn-ghost"
              style="display:block;margin:24px auto"
              onClick={loadMore}
              disabled={loadingMore()}
            >
              {loadingMore() ? "Loading more" : "Load more"}
            </button>
          </Show>
        </main>
        <LightBox url={lightboxUrl()} onClose={() => setLightboxUrl(null)} />
      </div>
    </Show>
  );
}
