import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { X } from "lucide-solid";
import { Page } from "~/components/Page";
import { LightBox } from "~/components/LightBox";
import { useAuth } from "~/lib/useAuth";
import { features } from "~/lib/features";
import { countBucket, trackEvent } from "~/lib/analytics";
import { getPostDetail, PostType, type Post } from "~/lib/api";
import { getPostMediaUrls } from "~/lib/sanitize";
import { htmlToText } from "~/lib/legacyHtml";
import {
  LegacyError,
  createAudioPost,
  createChatPost,
  createLinkPost,
  createPhotoPost,
  createQuotePost,
  createTextPost,
  createVideoPost,
  getLegacyComposerToken,
  getLegacyDraftEditor,
  getLegacyQueueEditor,
  getLinkPreview,
  legacyUpload,
  saveLegacyEditablePost,
  type LegacyPostMode,
  type LegacyPostType,
} from "~/lib/legacy";
import type { LegacyEditablePost } from "~/lib/legacyDrafts";
import { isDeletedPostError } from "~/lib/requestError";

import { cx } from "~/lib/cva";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
  TextFieldTextArea,
} from "~/components/ui/text-field";


const TYPES: { id: LegacyPostType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "quote", label: "Quote" },
  { id: "link", label: "Link" },
  { id: "chat", label: "Chat" },
  { id: "photo", label: "Image" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
];

type EditScope = "draft" | "queue" | "post";

type UploadEntry = { file: File; url: string };

const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(kilobytes < 10 ? 1 : 0)} KB`;
  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`;
}

function fileMatchesKind(file: File, kind: LegacyPostType): boolean {
  if (kind === "photo") {
    return PHOTO_TYPES.has(file.type) || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
  }
  if (kind === "video") return file.type === "video/mp4" || /\.mp4$/i.test(file.name);
  if (kind === "audio") {
    return file.type === "audio/mpeg" || /\.mp3$/i.test(file.name);
  }
  return true;
}

function parseTags(value: string): string[] {
  return [...new Set(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  )];
}

function normalizeType(value: string): LegacyPostType {
  if (value === "image") return "photo";
  if (TYPES.some((type) => type.id === value)) return value as LegacyPostType;
  return "text";
}

function typeFromPost(post: Post): LegacyPostType {
  if (post.type === PostType.Image) return "photo";
  if (post.type === PostType.Video) return "video";
  if (post.type === PostType.Audio) return "audio";
  if (post.type === PostType.Link) return "link";
  if (post.type === PostType.Chat) return "chat";
  if (post.type === PostType.Quote) return "quote";
  return "text";
}

function postEditor(post: Post): LegacyEditablePost {
  const type = typeFromPost(post);
  return {
    id: String(post.id),
    postId: String(post.id),
    comment: "",
    blogId: String(post.blogId ?? ""),
    blogName: post.blogName ?? "",
    type,
    title: post.title ?? "",
    body: post.content?.html ?? post.body ?? "",
    tags: post.tags ?? [],
    earlier: "1",
  };
}

export default function ComposePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams<{
    draft?: string;
    queue?: string;
    post?: string;
  }>();
  const { user, loading: authLoading, activeBlog } = useAuth();
  const scope: EditScope | null = searchParams.draft
    ? "draft"
    : searchParams.queue
      ? "queue"
      : searchParams.post
        ? "post"
        : null;
  const editId = searchParams.draft ?? searchParams.queue ?? searchParams.post;

  const [kind, setKind] = createSignal<LegacyPostType>("text");
  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [image, setImage] = createSignal("");
  const [tags, setTags] = createSignal("");
  const [uploads, setUploads] = createSignal<UploadEntry[]>([]);
  const files = () => uploads().map((entry) => entry.file);
  const [dragging, setDragging] = createSignal(false);
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [previewBusy, setPreviewBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");
  const [editor, setEditor] = createSignal<LegacyEditablePost | null>(null);
  const [editLoading, setEditLoading] = createSignal(!!scope);
  const [editBlogName, setEditBlogName] = createSignal("");

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  const loadEditor = async () => {
    setEditLoading(true);
    setError("");
    try {
      if (scope === "post") {
        const data = await getPostDetail(Number(editId));
        if (data.error || !data.post) {
          throw new Error(data.error || "Could not load the post");
        }
        applyPost(data.post);
      } else {
        const data =
          scope === "draft"
            ? await getLegacyDraftEditor(String(editId))
            : await getLegacyQueueEditor(String(editId));
        applyEditor(data);
      }
    } catch (err: unknown) {
      const message = (err as Error)?.message || "Could not load the editor";
      setError(
        scope === "post" && isDeletedPostError(err)
          ? "This post was deleted, so it can no longer be edited."
          : scope === "post" && /404|not found|cannot find any route/i.test(message)
            ? "BDSMLR's API does not have this post yet. Wait a moment and try again."
            : message,
      );
    } finally {
      setEditLoading(false);
    }
  };

  const applyEditor = (value: LegacyEditablePost) => {
    setEditor(value);
    setKind(normalizeType(value.type));
    setTitle(value.title);
    setContent(htmlToText(value.body));
    setTags(value.tags.join(", "));
    setEditBlogName(value.blogName);
  };

  const applyPost = (post: Post) => {
    const type = typeFromPost(post);
    const value = postEditor(post);
    setEditor(value);
    setKind(type);
    setEditBlogName(post.blogName ?? "");
    setTags((post.tags ?? []).join(", "));

    if (type === "quote") {
      setTitle(post.title || post.content?.quoteText || "");
      setContent(post.content?.quoteSource || htmlToText(value.body));
    } else if (type === "link") {
      setTitle(post.title || post.content?.title || "");
      setUrl(post.content?.url ?? "");
      setDescription(htmlToText(post.content?.html ?? post.content?.text ?? ""));
      setImage(getPostMediaUrls(post)[0] ?? "");
    } else {
      setTitle(post.title || post.content?.title || "");
      setContent(htmlToText(value.body));
    }
  };

  let editRequested = false;
  createEffect(() => {
    if (editRequested || authLoading() || !user() || !scope || !editId) return;
    editRequested = true;
    void loadEditor();
  });

  const switchKind = (next: LegacyPostType) => {
    if (scope) return;
    setKind(next);
    setError("");
    setSuccess("");
    setTitle("");
    setContent("");
    setUrl("");
    setDescription("");
    setImage("");
    setTags("");
    clearUploads();
  };

  const targetBlogId = () => {
    const current = editor();
    const id = current?.blogId ? Number(current.blogId) : activeBlog()?.id;
    return id && Number.isFinite(id) ? id : null;
  };

  const canSubmit = () => {
    if (!targetBlogId()) return false;
    const current = kind();
    if (current === "text" || current === "chat") {
      return !!title().trim();
    }
    if (current === "quote") return !!title().trim();
    if (current === "link") return !!url().trim();
    return scope ? true : files().length > 0;
  };

  const submit = async (mode: LegacyPostMode) => {
    const blogId = targetBlogId();
    if (!blogId || !canSubmit() || busy()) return;
    setBusy(true);
    setError("");
    setSuccess("");
    const tagList = parseTags(tags());
    try {
      const input = {
        blogId,
        tags: tagList,
        title: title().trim(),
        content: content(),
        source: content(),
        url: url().trim(),
        description: description(),
        image: image(),
      };

      if (scope) {
        const current = editor();
        if (!current) throw new Error("The editor is not ready yet");
        await saveLegacyEditablePost(scope, current, kind(), input);
        setSuccess("Changes saved.");
        trackEvent("post-edit", {
          postType: kind(),
          scope,
          tagCount: tagList.length,
        });
        return;
      }

      if (kind() === "text") {
        await createTextPost(input, mode);
      } else if (kind() === "quote") {
        await createQuotePost(input, mode);
      } else if (kind() === "chat") {
        await createChatPost(input, mode);
      } else if (kind() === "link") {
        await createLinkPost(input, mode);
      } else if (kind() === "photo") {
        const composer = await getLegacyComposerToken("photo");
        for (const file of files()) {
          await legacyUpload("photo", file, composer.token, blogId);
        }
        await createPhotoPost(input, mode, composer.token);
      } else if (kind() === "video") {
        const composer = await getLegacyComposerToken("video");
        await legacyUpload("video", files()[0], composer.csrf || composer.token, blogId);
        await createVideoPost(input, mode);
      } else if (kind() === "audio") {
        const composer = await getLegacyComposerToken("music");
        await legacyUpload("music", files()[0], composer.csrf || composer.token, blogId);
        await createAudioPost(input, mode);
      }

      setSuccess(
        mode === "queue"
          ? "Added to your queue."
          : mode === "draft"
            ? "Saved to your drafts."
            : "Post published.",
      );
      trackEvent("compose-submit", {
        postType: kind(),
        mode,
        tagCount: tagList.length,
        mediaCount: countBucket(files().length),
      });
      setTitle("");
      setContent("");
      setUrl("");
      setDescription("");
      setImage("");
      setTags("");
      clearUploads();
    } catch (err: unknown) {
      const status = err instanceof LegacyError ? err.status : 0;
      trackEvent(scope ? "post-edit-failure" : "compose-failure", {
        postType: kind(),
        mode,
        reason: status === 429 ? "rate-limited" : "error",
      });
      setError(
        status === 429
          ? "BDSMLR is rate limiting requests right now. This usually clears in a minute or two."
          : (err as Error)?.message || "Could not save the post",
      );
    } finally {
      setBusy(false);
    }
  };

  const fetchPreview = async () => {
    const value = url().trim();
    if (!value || previewBusy()) return;
    setPreviewBusy(true);
    setError("");
    try {
      const preview = await getLinkPreview(value);
      if (preview.title) setTitle(preview.title);
      if (preview.description) setDescription(preview.description);
      if (preview.image) setImage(preview.image);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Could not load the link preview");
    } finally {
      setPreviewBusy(false);
    }
  };

  const cancelEdit = () => {
    if (scope === "draft") navigate("/drafts");
    else if (scope === "queue") navigate("/queue");
    else if (scope === "post") {
      const value = editor();
      navigate(
        value?.blogName
          ? `/${value.blogName}/post/${value.postId}`
          : `/post/${value?.postId ?? editId}`,
      );
    }
  };

  const fileAccept = () => {
    if (kind() === "photo") return "image/jpeg,image/png,image/gif,image/webp";
    if (kind() === "video") return "video/mp4";
    return ".mp3,audio/mpeg";
  };

  const fileMultiple = () => kind() === "photo";

  const fileAcceptLabel = () => {
    if (kind() === "photo") return "JPG, PNG, GIF or WebP. You can add several.";
    if (kind() === "video") return "MP4";
    return "MP3";
  };

  const revokeUploads = (entries: UploadEntry[]) => {
    for (const entry of entries) URL.revokeObjectURL(entry.url);
  };

  const clearUploads = () => {
    revokeUploads(uploads());
    setUploads([]);
    setPreviewUrl(null);
  };

  const removeUpload = (index: number) => {
    const entry = uploads()[index];
    if (!entry) return;
    if (previewUrl() === entry.url) setPreviewUrl(null);
    URL.revokeObjectURL(entry.url);
    setUploads((previous) =>
      previous.filter((_, position) => position !== index),
    );
  };

  const addUploads = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const allowed = incoming.filter((file) => fileMatchesKind(file, kind()));
    const rejected = incoming.filter((file) => !fileMatchesKind(file, kind()));

    if (rejected.length > 0) {
      const names = rejected.map((file) => file.name).join(", ");
      setError(
        `${names} ${rejected.length === 1 ? "is not a supported file type" : "are not supported file types"} for ${typeLabel().toLowerCase()} posts.`,
      );
    } else {
      setError("");
    }

    if (allowed.length === 0) return;

    const entries = allowed.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    if (fileMultiple()) {
      setUploads((previous) => [...previous, ...entries]);
    } else {
      revokeUploads(uploads());
      setPreviewUrl(null);
      setUploads(entries.slice(0, 1));
    }
  };

  const uploadNoun = () => {
    const count = uploads().length;
    if (kind() === "photo") return count === 1 ? "image" : "images";
    if (kind() === "video") return "video";
    return "audio";
  };

  const uploadTotalSize = () =>
    formatBytes(
      uploads().reduce((total, entry) => total + entry.file.size, 0),
    );

  onCleanup(() => revokeUploads(uploads()));

  const typeLabel = () =>
    TYPES.find((type) => type.id === kind())?.label ?? "Post";

  const pageTitle = () =>
    scope === "draft"
      ? "Edit draft"
      : scope === "queue"
        ? "Edit queue post"
        : scope === "post"
          ? "Edit post"
          : "Compose";

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Page
        info={pageTitle()}
        actions={
          <Show when={editBlogName() || activeBlog()}>
            <span class="truncate text-xs text-muted-foreground">
              Posting to @{editBlogName() || activeBlog()!.name}
            </span>
          </Show>
        }
      >
        <Title>{pageTitle()} - bbdsmlr</Title>

        <Show
          when={!editLoading()}
          fallback={
            <p class="py-12 text-center text-sm text-muted-foreground">
              Loading editor…
            </p>
          }
        >
          <Show
            when={!scope}
            fallback={
              <div class="mb-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  class="h-10 rounded-full px-4"
                  disabled
                >
                  {typeLabel()}
                </Button>
              </div>
            }
          >
            <div
              class="mb-4 flex flex-wrap gap-2"
              role="group"
              aria-label="Post type"
            >
              <For each={TYPES}>
                {(type) => (
                  <Button
                    type="button"
                    variant={kind() === type.id ? "default" : "outline"}
                    aria-pressed={kind() === type.id}
                    class="h-10 rounded-full px-4"
                    onClick={() => switchKind(type.id)}
                  >
                    {type.label}
                  </Button>
                )}
              </For>
            </div>
          </Show>

          <Card class="gap-4 p-4 sm:p-5">
            <Show when={kind() === "text"}>
              <TextField value={title()} onChange={setTitle}>
                <TextFieldLabel>Title</TextFieldLabel>
                <TextFieldInput
                  type="text"
                  placeholder="Post title"
                  class="h-11 md:h-9"
                />
              </TextField>
              <TextField value={content()} onChange={setContent}>
                <TextFieldLabel>Body</TextFieldLabel>
                <TextFieldTextArea
                  rows={10}
                  placeholder="Write your post…"
                  class="min-h-40"
                />
              </TextField>
            </Show>

            <Show when={kind() === "quote"}>
              <TextField value={title()} onChange={setTitle}>
                <TextFieldLabel>Quote</TextFieldLabel>
                <TextFieldTextArea
                  rows={5}
                  placeholder="Quote text"
                  class="min-h-28"
                />
              </TextField>
              <TextField value={content()} onChange={setContent}>
                <TextFieldLabel>Source (optional)</TextFieldLabel>
                <TextFieldInput
                  type="text"
                  placeholder="Source"
                  class="h-11 md:h-9"
                />
              </TextField>
            </Show>

            <Show when={kind() === "chat"}>
              <TextField value={title()} onChange={setTitle}>
                <TextFieldLabel>Title</TextFieldLabel>
                <TextFieldInput
                  type="text"
                  placeholder="Chat title"
                  class="h-11 md:h-9"
                />
              </TextField>
              <TextField value={content()} onChange={setContent}>
                <TextFieldLabel>Transcript</TextFieldLabel>
                <TextFieldTextArea
                  rows={10}
                  placeholder="You: …&#10;Me: …"
                  class="min-h-40"
                />
              </TextField>
            </Show>

            <Show when={kind() === "link"}>
              <TextField value={url()} onChange={setUrl}>
                <TextFieldLabel>URL</TextFieldLabel>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <TextFieldInput
                    type="url"
                    placeholder="https://example.com"
                    class="h-11 flex-1 md:h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    class="h-11 w-full sm:w-auto md:h-9"
                    onClick={fetchPreview}
                    disabled={!url().trim() || previewBusy()}
                  >
                    {previewBusy() ? "Loading…" : "Fetch preview"}
                  </Button>
                </div>
              </TextField>
              <TextField value={title()} onChange={setTitle}>
                <TextFieldLabel>Title</TextFieldLabel>
                <TextFieldInput
                  type="text"
                  placeholder="Link title"
                  class="h-11 md:h-9"
                />
              </TextField>
              <TextField value={description()} onChange={setDescription}>
                <TextFieldLabel>Description</TextFieldLabel>
                <TextFieldTextArea
                  rows={4}
                  placeholder="Link description"
                  class="min-h-24"
                />
              </TextField>
              <TextField value={image()} onChange={setImage}>
                <TextFieldLabel>Preview image URL (optional)</TextFieldLabel>
                <TextFieldInput
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  class="h-11 md:h-9"
                />
              </TextField>
            </Show>

            <Show when={kind() === "photo" || kind() === "video" || kind() === "audio"}>
              <Show
                when={!scope}
                fallback={
                  <p class="text-sm text-muted-foreground">
                    Media cannot be changed in this editor. You can edit the
                    caption and tags.
                  </p>
                }
              >
                <div class="flex flex-col gap-2">
                  <span class="text-sm font-medium">
                    {kind() === "photo"
                      ? "Images"
                      : kind() === "video"
                        ? "Video"
                        : "Audio"}
                  </span>
                  <div
                    class={cx(
                      "relative flex min-h-32 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input bg-muted/30 px-4 py-6 text-center transition-colors",
                      "focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40",
                      dragging() && "border-primary bg-accent",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      addUploads(e.dataTransfer?.files ?? null);
                    }}
                  >
                    <input
                      class="absolute inset-0 size-full cursor-pointer opacity-0"
                      type="file"
                      accept={fileAccept()}
                      multiple={fileMultiple()}
                      aria-label={
                        fileMultiple() ? "Choose images" : "Choose a file"
                      }
                      onChange={(e) => {
                        addUploads(e.currentTarget.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    <strong class="text-sm font-semibold text-foreground">
                      {fileMultiple() ? "Choose images" : "Choose a file"}
                    </strong>
                    <span class="text-xs text-muted-foreground">
                      or drag and drop {fileMultiple() ? "them" : "it"} here
                    </span>
                    <span class="text-[11px] text-muted-foreground">
                      {fileAcceptLabel()}
                    </span>
                  </div>
                </div>
                <Show when={uploads().length > 0}>
                  <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {uploads().length} {uploadNoun()} · {uploadTotalSize()}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="h-10"
                      onClick={clearUploads}
                    >
                      Remove all
                    </Button>
                  </div>
                  <ul
                    class={cx(
                      "m-0 grid list-none gap-2 p-0",
                      fileMultiple() ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1",
                    )}
                  >
                    <For each={uploads()}>
                      {(entry, index) => (
                        <li class="relative flex min-w-0 flex-col gap-1.5 rounded-lg border bg-card p-2">
                          <Show
                            when={kind() === "photo"}
                            fallback={
                              <Show
                                when={kind() === "video"}
                                fallback={
                                  <div class="py-1">
                                    <audio
                                      src={entry.url}
                                      controls
                                      preload="metadata"
                                      class="w-full"
                                    />
                                  </div>
                                }
                              >
                                <video
                                  class="aspect-video w-full rounded-md bg-black object-contain"
                                  src={entry.url}
                                  controls
                                  preload="metadata"
                                  playsinline
                                />
                              </Show>
                            }
                          >
                            <button
                              type="button"
                              class="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-md bg-muted"
                              onClick={() => setPreviewUrl(entry.url)}
                              aria-label={`Enlarge ${entry.file.name}`}
                            >
                              <img
                                src={entry.url}
                                alt={entry.file.name}
                                loading="lazy"
                                class="size-full object-cover"
                              />
                            </button>
                          </Show>
                          <div class="flex min-w-0 flex-col gap-0.5 text-[11px] text-muted-foreground">
                            <span
                              class="truncate text-xs text-foreground"
                              title={entry.file.name}
                            >
                              {entry.file.name}
                            </span>
                            <span>{formatBytes(entry.file.size)}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            class="absolute top-1.5 right-1.5 size-10 rounded-full border bg-background/80 backdrop-blur hover:bg-destructive hover:text-white"
                            onClick={() => removeUpload(index())}
                            aria-label={`Remove ${entry.file.name}`}
                          >
                            <X class="size-3.5" />
                          </Button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </Show>
              <TextField value={content()} onChange={setContent}>
                <TextFieldLabel>Description (optional)</TextFieldLabel>
                <TextFieldTextArea
                  rows={5}
                  placeholder="Add a description"
                  class="min-h-28"
                />
              </TextField>
            </Show>

            <TextField value={tags()} onChange={setTags}>
              <TextFieldLabel>Tags</TextFieldLabel>
              <TextFieldInput
                type="text"
                placeholder="tag one, tag two"
                class="h-11 md:h-9"
              />
            </TextField>

            <Show when={error()}>
              <Alert variant="destructive">
                <AlertDescription>{error()}</AlertDescription>
              </Alert>
            </Show>
            <Show when={success()}>
              <Alert class="border-primary/40 bg-primary/10">
                <AlertDescription class="text-foreground">
                  {success()}
                </AlertDescription>
              </Alert>
            </Show>

            <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
              <Show
                when={scope}
                fallback={
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      class="h-11 w-full sm:h-9 sm:w-auto"
                      onClick={() => submit("draft")}
                      disabled={!canSubmit() || busy()}
                    >
                      Save draft
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      class="h-11 w-full sm:h-9 sm:w-auto"
                      onClick={() => submit("queue")}
                      disabled={!canSubmit() || busy()}
                    >
                      Add to queue
                    </Button>
                    <Button
                      type="button"
                      class="h-11 w-full sm:h-9 sm:w-auto"
                      onClick={() => submit("live")}
                      disabled={!canSubmit() || busy()}
                    >
                      {busy() ? "Publishing…" : "Publish"}
                    </Button>
                  </>
                }
              >
                <Button
                  type="button"
                  class="h-11 w-full sm:h-9 sm:w-auto"
                  onClick={() => submit("live")}
                  disabled={!canSubmit() || busy()}
                >
                  {busy() ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  class="h-11 w-full sm:h-9 sm:w-auto"
                  onClick={cancelEdit}
                  disabled={busy()}
                >
                  Cancel
                </Button>
              </Show>
            </div>
          </Card>

          <p class="mt-3 text-xs leading-relaxed text-muted-foreground">
            Posts are published through BDSMLR's legacy composer. If BDSMLR
            rejects or rate limits the request, wait a moment and try again.
          </p>

          <Show
            when={
              !scope &&
              (features.legacyAsks || features.legacyAdvancedSettings)
            }
          >
            <section class="mt-6 border-t pt-5">
              <h3 class="text-sm font-semibold">Legacy tools</h3>
              <p class="mt-1 text-sm text-muted-foreground">
                Asks and advanced blog settings still live on BDSMLR.
              </p>
              <div class="mt-2.5 flex flex-wrap gap-4 text-sm">
                <Show when={features.legacyAsks}>
                  <a
                    href="https://bdsmlr.com/asks"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-4 hover:underline"
                  >
                    Asks
                  </a>
                </Show>
                <Show when={features.legacyAdvancedSettings}>
                  <a
                    href="https://bdsmlr.com/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline-offset-4 hover:underline"
                  >
                    Settings
                  </a>
                </Show>
              </div>
            </section>
          </Show>
        </Show>
        <LightBox url={previewUrl()} onClose={() => setPreviewUrl(null)} />
      </Page>
    </Show>
  );
}
