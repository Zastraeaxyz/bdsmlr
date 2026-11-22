import { noteUpstreamRateLimit, noteUpstreamSuccess } from "./upstreamLimit";

export type LegacyPostType = "text" | "quote" | "link" | "chat" | "photo" | "video" | "audio";
export type LegacyPostMode = "live" | "queue" | "draft";

export interface LegacyPostInput {
  blogId: number;
  tags: string[];
  title?: string;
  content?: string;
  source?: string;
  url?: string;
  description?: string;
  image?: string;
}

export class LegacyError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function legacyResponse(res: Response): Promise<Response> {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      data?.error || data?.message || `BDSMLR returned HTTP ${res.status}`;
    if (res.status === 429 || data?.code === "UPSTREAM_RATE_LIMITED") {
      noteUpstreamRateLimit(Number(data?.retryAfterSeconds) || undefined);
    }
    throw new LegacyError(message, res.status);
  }
  noteUpstreamSuccess();
  return res;
}

export async function legacyRequest(
  path: string,
  fields: Record<string, string | number | string[] | undefined>,
): Promise<Response> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) body.append(`${key}[]`, item);
    } else {
      body.append(key, String(value));
    }
  }

  const res = await fetch(`/api/legacy${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return legacyResponse(res);
}

export interface LegacyComposerToken {
  token: string;
  csrf: string;
}

export async function getLegacyComposerToken(
  kind: "photo" | "video" | "music",
): Promise<LegacyComposerToken> {
  const res = await fetch(`/api/legacy/token?kind=${kind}`, {
    credentials: "include",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.token) {
    throw new LegacyError(
      data?.error || "Could not start the upload",
      res.status,
    );
  }
  return { token: data.token as string, csrf: (data.csrf as string) || "" };
}

export async function legacyUpload(
  kind: "photo" | "video" | "music",
  file: File,
  token: string,
  blogId: number,
): Promise<void> {
  const form = new FormData();
  form.append("_token", token);
  form.append("blog", String(blogId));
  form.append("file", file);
  const endpoint =
    kind === "photo" ? "/savephotos" : kind === "video" ? "/savevideo" : "/savemusic";
  const res = await fetch(`/api/legacy${endpoint}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  await legacyResponse(res);
}

export async function getLinkPreview(url: string) {
  const res = await legacyRequest("/getlink", { url });
  return res.json() as Promise<{
    title?: string;
    description?: string;
    image?: string | null;
  }>;
}

function textHtml(value: string): string {
  const text = value.trim();
  if (!text) return "";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<p>${escaped}</p>`;
}

function modeEndpoint(
  live: string,
  queue: string,
  draft: string,
  mode: LegacyPostMode,
): string {
  if (mode === "queue") return queue;
  if (mode === "draft") return draft;
  return live;
}

export async function createTextPost(
  input: LegacyPostInput,
  mode: LegacyPostMode,
) {
  const endpoint = modeEndpoint(
    "/savetext",
    "/savetextqueue",
    "/savetextdraft",
    mode,
  );
  return legacyRequest(endpoint, {
    thispost: textHtml(input.content ?? ""),
    blog: input.blogId,
    tags: input.tags,
    title: input.title ?? "",
  });
}

export async function createQuotePost(
  input: LegacyPostInput,
  mode: LegacyPostMode,
) {
  return legacyRequest(
    modeEndpoint("/savequote", "/savequotequeue", "/savequotedraft", mode),
    {
      thispost: input.source ?? "",
      blog: input.blogId,
      tags: input.tags,
      title: input.title ?? "",
    },
  );
}

export async function createChatPost(
  input: LegacyPostInput,
  mode: LegacyPostMode,
) {
  return legacyRequest(
    modeEndpoint("/savechat", "/savechatqueue", "/savechatdraft", mode),
    {
      thispost: input.content ?? "",
      blog: input.blogId,
      tags: input.tags,
      title: input.title ?? "",
    },
  );
}

export async function createLinkPost(
  input: LegacyPostInput,
  mode: LegacyPostMode,
) {
  return legacyRequest(
    modeEndpoint("/savelink", "/savelinkqueue", "/savelinkdraft", mode),
    {
      blog: input.blogId,
      description: input.description ?? "",
      image: input.image ?? "",
      tags: input.tags,
      title: input.title ?? "",
      url: input.url ?? "",
    },
  );
}

export async function createPhotoPost(
  input: LegacyPostInput,
  mode: LegacyPostMode,
  token: string,
) {
  const endpoint = modeEndpoint(
    "/newimgpost",
    "/newimgpostqueue",
    "/newimgpostdraft",
    mode,
  );
  return legacyRequest(endpoint, {
    comment: textHtml(input.content ?? ""),
    blog: input.blogId,
    tags: input.tags,
    captcha: token,
  });
}

export async function createVideoPost(
  input: LegacyPostInput,
  mode: LegacyPostMode,
) {
  const endpoint = modeEndpoint(
    "/savevideopost",
    "/savevideopostqueue",
    "/savevideopostdraft",
    mode,
  );
  return legacyRequest(endpoint, {
    comment: textHtml(input.content ?? ""),
    blog: input.blogId,
    tags: input.tags,
  });
}

export async function createAudioPost(
  input: LegacyPostInput,
  mode: LegacyPostMode,
) {
  return legacyRequest(
    modeEndpoint("/saveaudio", "/saveaudioqueue", "/saveaudiodraft", mode),
    {
      comment: textHtml(input.content ?? ""),
      blog: input.blogId,
      tags: input.tags,
    },
  );
}

export async function changeLegacyEmail(email: string) {
  return legacyRequest("/changemail", { passwd: email });
}

export async function changeLegacyPassword(password: string, confirm: string) {
  return legacyRequest("/changepassword", {
    passwd: password,
    passwd2: confirm,
  });
}

export async function changeLegacyBlogName(name: string) {
  return legacyRequest(`/changeusername/${encodeURIComponent(name)}`, {
    username: name,
  });
}

export interface LegacyCustomization {
  blogId: string;
  csrf: string;
  fields: Record<string, string | boolean>;
}

export async function getBlogCustomization(
  blogName: string,
): Promise<LegacyCustomization> {
  const res = await fetch(
    `/api/legacy/customize?blog=${encodeURIComponent(blogName)}`,
    { credentials: "include" },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.blogId) {
    throw new LegacyError(
      data?.error || "Could not load blog customization",
      res.status,
    );
  }
  return data as LegacyCustomization;
}

export async function saveBlogCustomization(
  blogId: string,
  fields: Record<string, string | boolean>,
): Promise<void> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (key === "_token") continue;
    body.append(key, typeof value === "boolean" ? (value ? "1" : "0") : value);
  }
  const res = await fetch(`/api/legacy/customizesave/${blogId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  await legacyResponse(res);
}

export async function uploadCustomization(
  path: string,
  file: File,
  token: string,
  extra: Record<string, string> = {},
): Promise<Response> {
  const form = new FormData();
  form.append("_token", token);
  for (const [key, value] of Object.entries(extra)) form.append(key, value);
  form.append("file", file);
  const res = await fetch(`/api/legacy${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return legacyResponse(res);
}

export async function getLegacyDrafts() {
  const res = await fetch("/api/legacy/drafts", { credentials: "include" });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new LegacyError(data?.error || "Could not load drafts", res.status);
  }
  return data.drafts as import("./legacyDrafts").LegacyDraft[];
}

async function getLegacyEditor(
  scope: "draft" | "queue",
  id: string,
): Promise<import("./legacyDrafts").LegacyEditablePost> {
  const res = await fetch(
    `/api/legacy/${scope === "draft" ? "drafts" : "queue"}?id=${encodeURIComponent(id)}`,
    { credentials: "include" },
  );
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.editor) {
    throw new LegacyError(
      data?.error || "Could not load the editor",
      res.status,
    );
  }
  return data.editor as import("./legacyDrafts").LegacyEditablePost;
}

export function getLegacyDraftEditor(id: string) {
  return getLegacyEditor("draft", id);
}

export function getLegacyQueueEditor(id: string) {
  return getLegacyEditor("queue", id);
}

export async function saveLegacyEditablePost(
  scope: "draft" | "queue" | "post",
  editor: import("./legacyDrafts").LegacyEditablePost,
  kind: LegacyPostType,
  input: LegacyPostInput,
) {
  const html = textHtml(input.content ?? "");
  const fields: Record<string, string | number | string[] | undefined> = {
    thispost: kind === "quote" ? input.source ?? "" : html,
    blog: editor.blogId,
    tags: input.tags,
    type: editor.type || kind,
    title: input.title ?? "",
    textpost: html,
    postid: editor.postId,
    nocomment: editor.comment ? "false" : "true",
    textpostcase: html,
    blogid: editor.blogId,
    earlier: editor.earlier || "1",
  };
  if (kind === "link") {
    fields.url = input.url ?? "";
    fields.description = input.description ?? "";
    fields.image = input.image ?? "";
  }
  const endpoint =
    scope === "draft"
      ? "/editdraftpost/"
      : scope === "queue"
        ? "/editqueuepost/"
        : `/editpost/${editor.postId}`;
  return legacyRequest(endpoint, fields);
}

export async function getLegacyQueue() {
  const res = await fetch("/api/legacy/queue", { credentials: "include" });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new LegacyError(data?.error || "Could not load the queue", res.status);
  }
  return data.queue as import("./legacyQueue").LegacyQueue;
}

export async function publishLegacyQueueItem(id: string) {
  return legacyRequest("/publishpost", { id });
}

export async function deleteLegacyQueueItem(id: string) {
  return legacyRequest("/queuedelete", { id });
}

export async function scheduleLegacyQueueItem(
  id: string,
  date: Date,
) {
  return legacyRequest("/queueCalendar", {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    postId: id,
  });
}

export async function publishLegacyDraft(id: string, queue: boolean) {
  return legacyRequest(
    queue ? "/publishpostdrafttoqueue" : "/publishpostdraft",
    { id },
  );
}

export async function deleteLegacyDraft(id: string) {
  return legacyRequest("/draftdelete", { id });
}
