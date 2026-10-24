import { createEffect, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import Header from "~/components/Header";
import { useAuth } from "~/lib/useAuth";
import {
  LegacyError,
  createAudioPost,
  createChatPost,
  createLinkPost,
  createPhotoPost,
  createQuotePost,
  createTextPost,
  createVideoPost,
  getLegacyUploadToken,
  getLinkPreview,
  legacyUpload,
  type LegacyPostMode,
  type LegacyPostType,
} from "~/lib/legacy";

const TYPES: { id: LegacyPostType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "quote", label: "Quote" },
  { id: "link", label: "Link" },
  { id: "chat", label: "Chat" },
  { id: "photo", label: "Image" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
];

function parseTags(value: string): string[] {
  return [...new Set(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  )];
}

export default function ComposePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, activeBlog } = useAuth();
  const [kind, setKind] = createSignal<LegacyPostType>("text");
  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [image, setImage] = createSignal("");
  const [tags, setTags] = createSignal("");
  const [files, setFiles] = createSignal<File[]>([]);
  const [busy, setBusy] = createSignal(false);
  const [previewBusy, setPreviewBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");

  createEffect(() => {
    if (!authLoading() && !user()) navigate("/login", { replace: true });
  });

  const switchKind = (next: LegacyPostType) => {
    setKind(next);
    setError("");
    setSuccess("");
    setTitle("");
    setContent("");
    setUrl("");
    setDescription("");
    setImage("");
    setTags("");
    setFiles([]);
  };

  const canSubmit = () => {
    if (!activeBlog()) return false;
    const current = kind();
    if (current === "text" || current === "chat") {
      return !!title().trim();
    }
    if (current === "quote") return !!title().trim();
    if (current === "link") return !!url().trim();
    return files().length > 0;
  };

  const submit = async (mode: LegacyPostMode) => {
    const blog = activeBlog();
    if (!blog || !canSubmit() || busy()) return;
    setBusy(true);
    setError("");
    setSuccess("");
    const tagList = parseTags(tags());
    try {
      if (kind() === "text") {
        await createTextPost(
          {
            blogId: blog.id,
            tags: tagList,
            title: title().trim(),
            content: content(),
          },
          mode,
        );
      } else if (kind() === "quote") {
        await createQuotePost({
          blogId: blog.id,
          tags: tagList,
          title: title().trim(),
          source: content(),
        });
      } else if (kind() === "chat") {
        await createChatPost({
          blogId: blog.id,
          tags: tagList,
          title: title().trim(),
          content: content(),
        });
      } else if (kind() === "link") {
        await createLinkPost({
          blogId: blog.id,
          tags: tagList,
          title: title().trim(),
          url: url().trim(),
          description: description(),
          image: image(),
        });
      } else if (kind() === "photo") {
        const token = await getLegacyUploadToken("photo");
        for (const file of files()) {
          await legacyUpload("photo", file, token, blog.id);
        }
        await createPhotoPost(
          {
            blogId: blog.id,
            tags: tagList,
            content: content(),
          },
          mode,
          token,
        );
      } else if (kind() === "video") {
        const token = await getLegacyUploadToken("video");
        await legacyUpload("video", files()[0], token, blog.id);
        await createVideoPost(
          {
            blogId: blog.id,
            tags: tagList,
            content: content(),
          },
          mode,
        );
      } else if (kind() === "audio") {
        const token = await getLegacyUploadToken("music");
        await legacyUpload("music", files()[0], token, blog.id);
        await createAudioPost({
          blogId: blog.id,
          tags: tagList,
          content: content(),
        });
      }
      setSuccess(
        mode === "queue"
          ? "Added to your queue."
          : mode === "draft"
            ? "Saved to your drafts."
            : "Post published.",
      );
      setTitle("");
      setContent("");
      setUrl("");
      setDescription("");
      setImage("");
      setTags("");
      setFiles([]);
    } catch (err: unknown) {
      const status = err instanceof LegacyError ? err.status : 0;
      setError(
        status === 429
          ? "BDSMLR temporarily blocked the request. Wait a moment and try again."
          : (err as Error)?.message || "Could not publish the post",
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

  const fileAccept = () => {
    if (kind() === "photo") return "image/jpeg,image/png,image/gif,image/webp";
    if (kind() === "video") return "video/mp4";
    return ".mp3,audio/mpeg";
  };

  const fileMultiple = () => kind() === "photo";

  return (
    <Show when={!authLoading() && user()} fallback={null}>
      <Title>Compose - bbdsmlr</Title>
      <div class="home-page">
        <Header info="Compose">
          <Show when={activeBlog()}>
            <span class="compose-blog">Posting to @{activeBlog()!.name}</span>
          </Show>
        </Header>
        <main>
          <div class="compose-tabs">
            <For each={TYPES}>
              {(type) => (
                <button
                  type="button"
                  class={kind() === type.id ? "compose-tab active" : "compose-tab"}
                  onClick={() => switchKind(type.id)}
                >
                  {type.label}
                </button>
              )}
            </For>
          </div>

          <section class="compose-card">
            <Show when={kind() === "text"}>
              <label class="compose-field">
                <span>Title</span>
                <input
                  type="text"
                  value={title()}
                  onInput={(e) => setTitle(e.currentTarget.value)}
                  placeholder="Post title"
                />
              </label>
              <label class="compose-field">
                <span>Body</span>
                <textarea
                  rows={10}
                  value={content()}
                  onInput={(e) => setContent(e.currentTarget.value)}
                  placeholder="Write your post…"
                />
              </label>
            </Show>

            <Show when={kind() === "quote"}>
              <label class="compose-field">
                <span>Quote</span>
                <textarea
                  rows={5}
                  value={title()}
                  onInput={(e) => setTitle(e.currentTarget.value)}
                  placeholder="Quote text"
                />
              </label>
              <label class="compose-field">
                <span>Source (optional)</span>
                <input
                  type="text"
                  value={content()}
                  onInput={(e) => setContent(e.currentTarget.value)}
                  placeholder="Source"
                />
              </label>
            </Show>

            <Show when={kind() === "chat"}>
              <label class="compose-field">
                <span>Title</span>
                <input
                  type="text"
                  value={title()}
                  onInput={(e) => setTitle(e.currentTarget.value)}
                  placeholder="Chat title"
                />
              </label>
              <label class="compose-field">
                <span>Transcript</span>
                <textarea
                  rows={10}
                  value={content()}
                  onInput={(e) => setContent(e.currentTarget.value)}
                  placeholder="You: …&#10;Me: …"
                />
              </label>
            </Show>

            <Show when={kind() === "link"}>
              <label class="compose-field">
                <span>URL</span>
                <div class="compose-inline">
                  <input
                    type="url"
                    value={url()}
                    onInput={(e) => setUrl(e.currentTarget.value)}
                    placeholder="https://example.com"
                  />
                  <button
                    type="button"
                    class="btn-ghost"
                    onClick={fetchPreview}
                    disabled={!url().trim() || previewBusy()}
                  >
                    {previewBusy() ? "Loading…" : "Fetch preview"}
                  </button>
                </div>
              </label>
              <label class="compose-field">
                <span>Title</span>
                <input
                  type="text"
                  value={title()}
                  onInput={(e) => setTitle(e.currentTarget.value)}
                  placeholder="Link title"
                />
              </label>
              <label class="compose-field">
                <span>Description</span>
                <textarea
                  rows={4}
                  value={description()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  placeholder="Link description"
                />
              </label>
              <label class="compose-field">
                <span>Preview image URL (optional)</span>
                <input
                  type="url"
                  value={image()}
                  onInput={(e) => setImage(e.currentTarget.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </label>
            </Show>

            <Show when={kind() === "photo" || kind() === "video" || kind() === "audio"}>
              <label class="compose-field">
                <span>
                  {kind() === "photo"
                    ? "Images"
                    : kind() === "video"
                      ? "Video"
                      : "Audio"}
                </span>
                <input
                  type="file"
                  accept={fileAccept()}
                  multiple={fileMultiple()}
                  onChange={(e) =>
                    setFiles(Array.from(e.currentTarget.files ?? []))
                  }
                />
              </label>
              <Show when={files().length > 0}>
                <p class="compose-files">
                  Selected: {files().map((file) => file.name).join(", ")}
                </p>
              </Show>
              <label class="compose-field">
                <span>Description (optional)</span>
                <textarea
                  rows={5}
                  value={content()}
                  onInput={(e) => setContent(e.currentTarget.value)}
                  placeholder="Add a description"
                />
              </label>
            </Show>

            <label class="compose-field">
              <span>Tags</span>
              <input
                type="text"
                value={tags()}
                onInput={(e) => setTags(e.currentTarget.value)}
                placeholder="tag one, tag two"
              />
            </label>

            <Show when={error()}>
              <p class="error">{error()}</p>
            </Show>
            <Show when={success()}>
              <p class="action-notice">{success()}</p>
            </Show>

            <div class="compose-actions">
              <Show
                when={kind() === "text" || kind() === "photo" || kind() === "video"}
              >
                <button
                  type="button"
                  class="btn-ghost"
                  onClick={() => submit("draft")}
                  disabled={!canSubmit() || busy()}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  class="btn-ghost"
                  onClick={() => submit("queue")}
                  disabled={!canSubmit() || busy()}
                >
                  Add to queue
                </button>
              </Show>
              <button
                type="button"
                onClick={() => submit("live")}
                disabled={!canSubmit() || busy()}
              >
                {busy() ? "Publishing…" : "Publish"}
              </button>
            </div>
          </section>

          <p class="compose-note">
            Posts are published through BDSMLR's legacy composer. If BDSMLR
            rejects or rate limits the request, wait a moment and try again.
          </p>

          <section class="compose-legacy">
            <h3>Legacy tools</h3>
            <p>
              Queue management, drafts, asks, and blog settings still live on
              BDSMLR.
            </p>
            <div class="compose-legacy-links">
              <a
                href="https://bdsmlr.com/queuev2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Queue
              </a>
              <a
                href="https://bdsmlr.com/drafts"
                target="_blank"
                rel="noopener noreferrer"
              >
                Drafts
              </a>
              <a
                href="https://bdsmlr.com/asks"
                target="_blank"
                rel="noopener noreferrer"
              >
                Asks
              </a>
              <a
                href="https://bdsmlr.com/settings"
                target="_blank"
                rel="noopener noreferrer"
              >
                Settings
              </a>
            </div>
          </section>
        </main>
      </div>
    </Show>
  );
}
