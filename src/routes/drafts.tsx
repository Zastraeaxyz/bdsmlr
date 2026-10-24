import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { useAuth } from "~/lib/useAuth";
import {
  deleteLegacyDraft,
  getLegacyDrafts,
  LegacyError,
  publishLegacyDraft,
} from "~/lib/legacy";
import type { LegacyDraft } from "~/lib/legacyDrafts";

function imageUrl(value?: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://bdsmlr.com${value.startsWith("/") ? "" : "/"}${value}`;
}

export default function DraftsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [drafts, setDrafts] = createSignal<LegacyDraft[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [busy, setBusy] = createSignal("");
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal("");

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setDrafts(await getLegacyDrafts());
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not load drafts");
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (authLoading() || !user()) return;
    void load();
  });

  const run = async (
    id: string,
    label: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    if (busy()) return;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    } catch (err: unknown) {
      setError(
        err instanceof LegacyError && err.status === 429
          ? "BDSMLR temporarily blocked the request. Wait a moment and try again."
          : (err as Error)?.message || "Draft action failed",
      );
    } finally {
      setBusy("");
    }
  };

  const remove = (draft: LegacyDraft) => {
    if (!window.confirm("Delete this draft?")) return;
    void run(
      draft.id,
      "delete",
      () => deleteLegacyDraft(draft.id),
      "Draft deleted.",
    );
  };

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Title>Drafts - bbdsmlr</Title>
      <div class="home-page">
        <Header info="Drafts" />
        <main>
          <h2 class="social-list-title">Drafts</h2>
          {error() && <p class="error">{error()}</p>}
          {notice() && <p class="action-notice">{notice()}</p>}
          {loading() && <p class="loading">Loading drafts…</p>}
          <Show when={!loading()}>
            <Show
              when={drafts().length > 0}
              fallback={<p class="empty">No drafts.</p>}
            >
              <div class="draft-list">
                <For each={drafts()}>
                  {(draft) => (
                    <article class="draft-card">
                      <Show when={draft.image}>
                        <img
                          class="draft-image"
                          src={imageUrl(draft.image)}
                          alt=""
                        />
                      </Show>
                      <div class="draft-content">
                        <Show when={draft.title}>
                          <h3>{draft.title}</h3>
                        </Show>
                        <Show when={draft.text}>
                          <p>{draft.text}</p>
                        </Show>
                        <Show when={draft.tags.length > 0}>
                          <div class="draft-tags">
                            <For each={draft.tags}>
                              {(tag) => <span class="tag">#{tag}</span>}
                            </For>
                          </div>
                        </Show>
                        <div class="draft-actions">
                          <button
                            type="button"
                            onClick={() =>
                              void run(
                                draft.id,
                                "publish",
                                () => publishLegacyDraft(draft.id, false),
                                "Draft published.",
                              )
                            }
                            disabled={busy() !== ""}
                          >
                            {busy() === "publish" ? "Publishing…" : "Publish"}
                          </button>
                          <button
                            type="button"
                            class="btn-ghost"
                            onClick={() =>
                              void run(
                                draft.id,
                                "queue",
                                () => publishLegacyDraft(draft.id, true),
                                "Draft moved to the queue.",
                              )
                            }
                            disabled={busy() !== ""}
                          >
                            {busy() === "queue" ? "Moving…" : "Publish to queue"}
                          </button>
                          <button
                            type="button"
                            class="btn-ghost danger-text"
                            onClick={() => remove(draft)}
                            disabled={busy() !== ""}
                          >
                            {busy() === "delete" ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  )}
                </For>
              </div>
            </Show>
          </Show>
          <p class="compose-note">
            Draft editing still uses BDSMLR's legacy editor. This page supports
            listing, publishing, moving to the queue, and deleting drafts.
          </p>
        </main>
      </div>
    </Show>
  );
}
