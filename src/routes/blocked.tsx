import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { Page, PageHeader } from "~/components/Page";
import { EmptyState } from "~/components/FeedStates";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { useAuth } from "~/lib/useAuth";
import {
  getBlocked,
  resolveIdentifierById,
  unblockBlog,
} from "~/lib/api";

interface BlockedBlog {
  id: number;
  name: string;
}

export default function BlockedPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, activeBlogId } = useAuth();
  const [blogs, setBlogs] = createSignal<BlockedBlog[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [busyId, setBusyId] = createSignal<number | null>(null);

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  const load = async () => {
    const current = user();
    if (!current) return;
    setLoading(true);
    setError("");
    try {
      const data = await getBlocked(current.user_id);
      const ownIds = new Set((current.blogs ?? []).map((blog) => blog.id));
      if (current.blog_id) ownIds.add(current.blog_id);
      const ids = (data.blocked_blog_ids ?? data.blockedBlogIds ?? [])
        .map(Number)
        .filter((id) => !ownIds.has(id));
      const resolved = await Promise.all(
        ids.map(async (id) => {
          try {
            const info = await resolveIdentifierById(id);
            return { id, name: info.blogName || `Blog #${id}` };
          } catch {
            return { id, name: `Blog #${id}` };
          }
        }),
      );
      setBlogs(resolved);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to load blocked blogs");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (authLoading() || !user()) return;
    void load();
  });

  const unblock = async (id: number) => {
    const actor = activeBlogId();
    if (!actor || busyId()) return;
    setBusyId(id);
    setError("");
    try {
      const res = await unblockBlog(actor, id);
      if (res.ok === false || res.error) {
        throw new Error(res.error?.message || "Could not unblock the blog");
      }
      setBlogs((prev) => prev.filter((blog) => blog.id !== id));
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not unblock the blog");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Page info="Blocked blogs">
      <Title>Blocked blogs - bbdsmlr</Title>

      <PageHeader
        title="Blocked blogs"
        description="Blogs you have blocked on BDSMLR. Unblocking makes their posts visible again."
      />

      <Show when={error()}>
        <FeedErrorNotice message={error()} />
      </Show>

      <Show when={loading()}>
        <p class="text-sm text-muted-foreground">Loading blocked blogs…</p>
      </Show>

      <Show when={!loading()}>
        <Show
          when={blogs().length > 0}
          fallback={<EmptyState>No blocked blogs.</EmptyState>}
        >
          <Card class="gap-0 py-0">
            <CardContent class="divide-y divide-border px-0 py-0">

              <For each={blogs()}>
                {(blog) => (
                  <div class="flex items-center justify-between gap-3 px-3 py-1.5">
                    <A
                      href={`/${blog.name}`}
                      class="flex min-h-11 min-w-0 flex-1 items-center truncate rounded-md px-1 text-sm font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {blog.name}
                    </A>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="h-11 md:h-9 px-3"
                      onClick={() => unblock(blog.id)}
                      disabled={busyId() !== null}
                    >
                      {busyId() === blog.id ? "Unblocking…" : "Unblock"}
                    </Button>
                  </div>
                )}
              </For>
            </CardContent>
          </Card>
        </Show>
      </Show>
    </Page>
  );
}
