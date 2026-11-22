import { createSignal, Show } from "solid-js";
import type { Post } from "~/lib/api";
import { RelatedPostsFeed } from "~/components/RelatedPosts";
import { BlogHistoricPosts } from "~/components/BlogHistoricPosts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type MoreTab = "related" | "blog";

export function PostMoreTabs(props: { post: Post }) {
  const [tab, setTab] = createSignal<MoreTab>("related");
  const [blogSeen, setBlogSeen] = createSignal(false);

  const blogName = () => props.post.blogName ?? "";
  const canShowBlog = () =>
    !!props.post.id &&
    !!props.post.blogId &&
    !!props.post.blogName &&
    !!props.post.createdAtUnix;

  return (
    <section class="mt-6">
      <Tabs
        value={tab()}
        onChange={(value) => {
          const next = value as MoreTab;
          if (next === "blog") setBlogSeen(true);
          setTab(next);
        }}
      >
        <TabsList class="w-full justify-start overflow-x-auto">
          <TabsTrigger value="related" class="shrink-0">
            More like this
          </TabsTrigger>
          <Show when={canShowBlog()}>
            <TabsTrigger value="blog" class="max-w-[60vw] shrink-0">
              <span class="truncate">More from {blogName()}</span>
            </TabsTrigger>
          </Show>
        </TabsList>
        <TabsContent value="related" class="mt-3">
          <Show when={tab() === "related"}>
            <RelatedPostsFeed postId={props.post.id} />
          </Show>
        </TabsContent>
        <Show when={canShowBlog()}>
          <TabsContent value="blog" class="mt-3">
            <Show when={blogSeen()}>
              <BlogHistoricPosts
                postId={props.post.id}
                blogId={Number(props.post.blogId)}
                blogName={props.post.blogName!}
                createdAtUnix={Number(props.post.createdAtUnix)}
              />
            </Show>
          </TabsContent>
        </Show>
      </Tabs>
    </section>
  );
}
