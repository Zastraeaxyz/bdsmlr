import { createSignal } from "solid-js";
import type { Post } from "~/lib/api";
import { startReblogJob } from "~/lib/reblogJobs";
import { postTypeName } from "~/lib/postTypes";
import { surfaceForPath, trackEvent } from "~/lib/analytics";
import { sheetDialogClass } from "~/lib/ui";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "./ui/dialog";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from "./ui/text-field";

export function ReblogComposer(props: {
  post: Post;
  onClose: () => void;
  onDone?: (mode: "live" | "queue") => void;
}) {
  const [note, setNote] = createSignal("");
  const [tags, setTags] = createSignal("");
  let submitted = false;

  const tagList = () =>
    [
      ...new Set(
        tags()
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];

  const submit = (mode: "live" | "queue", event?: Event) => {
    event?.preventDefault();
    if (submitted) return;
    submitted = true;

    const comment = note().trim() || undefined;
    const tagValues = tagList();

    startReblogJob({
      post: props.post,
      mode,
      comment,
      tags: tagValues,
    });
    trackEvent("reblog", {
      surface:
        typeof window === "undefined"
          ? "post"
          : surfaceForPath(window.location.pathname),
      postType: postTypeName(props.post.type),
      mode,
      hasNote: !!comment,
      tagCount: tagValues.length,
    });
    props.onDone?.(mode);
    props.onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogPortal>
        <DialogContent class={sheetDialogClass}>
          <DialogHeader>
            <DialogTitle>Reblog post</DialogTitle>
            <DialogDescription>
              Share this post on your blog, with an optional note and tags.
            </DialogDescription>
          </DialogHeader>
          <form class="flex flex-col gap-4" onSubmit={(event) => submit("live", event)}>
            <TextField value={note()} onChange={setNote}>
              <TextFieldLabel>Note (optional)</TextFieldLabel>
              <TextFieldTextArea
                rows={3}
                placeholder="Add a note…"
                class="min-h-20"
              />
            </TextField>
            <TextField value={tags()} onChange={setTags}>
              <TextFieldLabel>Tags (optional)</TextFieldLabel>
              <TextFieldInput placeholder="tag one, tag two" />
            </TextField>
            <DialogFooter class="gap-2">
              <Button type="button" variant="ghost" onClick={props.onClose}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={() => submit("queue")}>
                Queue
              </Button>
              <Button type="submit">Reblog</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
