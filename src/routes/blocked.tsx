import { createEffect, createSignal, For, Show } from "solid-js";
import { FeedErrorNotice } from "~/components/FeedErrorNotice";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
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
    <div class="home-page">
      <Title>Blocked blogs - bbdsmlr</Title>
      <Header info="Blocked blogs" />
      <main>
        <h2 class="social-list-title">Blocked blogs</h2>
        {error() && <FeedErrorNotice message={error()} />}
        {loading() && <p class="loading">Loading blocked blogs…</p>}
        <Show when={!loading()}>
          <Show
            when={blogs().length > 0}
            fallback={<p class="empty">No blocked blogs.</p>}
          >
            <div class="following-list">
              <For each={blogs()}>
                {(blog) => (
                  <div class="blocked-item">
                    <A href={`/${blog.name}`} class="following-item-name">
                      {blog.name}
                    </A>
                    <button
                      type="button"
                      class="btn-ghost"
                      onClick={() => unblock(blog.id)}
                      disabled={busyId() !== null}
                    >
                      {busyId() === blog.id ? "Unblocking…" : "Unblock"}
                    </button>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </main>
    </div>
  );
}
