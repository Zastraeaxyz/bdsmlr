import { createSignal } from "solid-js";
import type { Post } from "~/lib/api";
import { startReblogJob } from "~/lib/reblogJobs";
import { postTypeName } from "~/lib/postTypes";
import { surfaceForPath, trackEvent } from "~/lib/analytics";

export function ReblogComposer(props: {
  post: Post;
  onClose: () => void;
  onDone?: (mode: "live" | "queue") => void;
}) {
  const [note, setNote] = createSignal("");
  const [tags, setTags] = createSignal("");
  let submitted = false;

  const tagList = () =>
    [...new Set(
      tags()
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    )];

  const submit = (mode: "live" | "queue", e?: Event) => {
    e?.preventDefault();
    if (submitted) return;
    submitted = true;

    const comment = note().trim() || undefined;
    const tags = tagList();

    startReblogJob({
      post: props.post,
      mode,
      comment,
      tags,
    });
    trackEvent("reblog", {
      surface:
        typeof window === "undefined"
          ? "post"
          : surfaceForPath(window.location.pathname),
      postType: postTypeName(props.post.type),
      mode,
      hasNote: !!comment,
      tagCount: tags.length,
    });
    props.onDone?.(mode);
    props.onClose();
  };

  return (
    <div class="tag-modal-backdrop" onClick={props.onClose}>
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
          />
        </label>
        <label class="reblog-field">
          <span>Tags (optional)</span>
          <input
            type="text"
            placeholder="tag one, tag two"
            value={tags()}
            onInput={(e) => setTags(e.currentTarget.value)}
          />
        </label>
        <div class="reblog-actions">
          <button type="button" class="btn-ghost" onClick={props.onClose}>
            Cancel
          </button>
          <button type="button" class="btn-ghost" onClick={() => submit("queue")}>
            Queue
          </button>
          <button type="submit">Reblog</button>
        </div>
      </form>
    </div>
  );
}
