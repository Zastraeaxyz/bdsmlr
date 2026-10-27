import { createSignal, Show } from "solid-js";
import type { Post } from "~/lib/api";
import { reblog } from "~/lib/postInteractions";
import { postTypeName } from "~/lib/postTypes";
import { surfaceForPath, trackEvent } from "~/lib/analytics";

export function ReblogComposer(props: {
  post: Post;
  onClose: () => void;
  onDone?: (mode: "live" | "queue") => void;
}) {
  const [note, setNote] = createSignal("");
  const [tags, setTags] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [status, setStatus] = createSignal("");

  const tagList = () =>
    [...new Set(
      tags()
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    )];

  const submit = async (mode: "live" | "queue", e?: Event) => {
    e?.preventDefault();
    if (busy()) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await reblog(props.post, {
        mode,
        comment: note().trim() || undefined,
        tags: tagList(),
      });
      setStatus(mode === "queue" ? "Queued." : "Reblogged.");
      trackEvent("reblog", {
        surface:
          typeof window === "undefined"
            ? "post"
            : surfaceForPath(window.location.pathname),
        postType: postTypeName(props.post.type),
        mode,
        hasNote: note().trim().length > 0,
        tagCount: tagList().length,
      });
      props.onDone?.(mode);
      props.onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not reblog post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="tag-modal-backdrop" onClick={() => !busy() && props.onClose()}>
      <form
        class="tag-modal reblog-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => submit("live", e)}
      >
        <button
          type="button"
          class="tag-modal-close"
          onClick={props.onClose}
          aria-label="Close reblog"
          disabled={busy()}
        >
          ×
        </button>
        <h3>Reblog post</h3>
        <label class="reblog-field">
          <span>Note (optional)</span>
          <textarea
            rows={3}
            placeholder="Add a note…"
            value={note()}
            onInput={(e) => setNote(e.currentTarget.value)}
            disabled={busy()}
          />
        </label>
        <label class="reblog-field">
          <span>Tags (optional)</span>
          <input
            type="text"
            placeholder="tag one, tag two"
            value={tags()}
            onInput={(e) => setTags(e.currentTarget.value)}
            disabled={busy()}
          />
        </label>
        <Show when={error()}>
          <p class="error">{error()}</p>
        </Show>
        <Show when={status()}>
          <p class="reblog-status">{status()}</p>
        </Show>
        <div class="reblog-actions">
          <button
            type="button"
            class="btn-ghost"
            onClick={props.onClose}
            disabled={busy()}
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn-ghost"
            onClick={() => submit("queue")}
            disabled={busy()}
          >
            Queue
          </button>
          <button type="submit" disabled={busy()}>
            {busy() ? "Reblogging…" : "Reblog"}
          </button>
        </div>
      </form>
    </div>
  );
}
