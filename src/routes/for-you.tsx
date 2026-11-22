import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { FeatureDisabled } from "~/components/FeatureDisabled";
import { features } from "~/lib/features";
import { PostFeed } from "~/components/PostFeed";
import { FeedSkeleton, EmptyState } from "~/components/FeedStates";
import { Page, PageHeader } from "~/components/Page";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AutoLoadMore } from "~/components/AutoLoadMore";
import { BlogCard } from "~/components/BlogCard";
import { LightBox } from "~/components/LightBox";
import { useAuth } from "~/lib/useAuth";
import {
  forYou,
  listRecommendedBlogs,
  type Blog,
  type Post,
} from "~/lib/api";
import { createMediaGallery } from "~/lib/mediaGallery";
import { tagSearchHref } from "~/lib/tagLinks";

const PAGE_SIZE = 20;

export default function ForYouPage() {
  if (!features.forYou) return <FeatureDisabled title="For you" />;

  const navigate = useNavigate();
  const { user, loading: authLoading, activeBlog } = useAuth();
  const [posts, setPosts] = createSignal<Post[]>([]);
  const [blogs, setBlogs] = createSignal<Blog[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const [error, setError] = createSignal("");
  const gallery = createMediaGallery({ posts: () => posts() });
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
    navigate(tagSearchHref(tag));
  };

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Title>For you - bbdsmlr</Title>
      <Page info="For you">
        <Show when={blogs().length > 0}>
          <section class="mb-6">
            <PageHeader title="Recommended blogs" />
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <For each={blogs()}>
                {(blog) => <BlogCard blog={blog} />}
              </For>
            </div>
          </section>
        </Show>


        <PageHeader title="For you" />
        <Show when={error()}>
          <FeedErrorNotice message={error()} />
        </Show>
        <Show when={loading()}>
          <FeedSkeleton />
        </Show>
        <Show when={!loading()}>
          <Show
            when={posts().length > 0}
            fallback={<EmptyState>No recommendations yet.</EmptyState>}
          >
            <PostFeed
              posts={posts()}
              onTagClick={openTag}
              onImageClick={(url, postId) => gallery.open(url, postId)}
            />

          </Show>
        </Show>
        <Show when={nextPageToken}>
          <AutoLoadMore onLoad={loadMore} loading={loadingMore()} />
        </Show>
      </Page>
      <LightBox gallery={gallery} />
    </Show>
  );
}
