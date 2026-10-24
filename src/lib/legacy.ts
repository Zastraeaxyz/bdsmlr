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
    throw new LegacyError(
      data?.error || data?.message || `BDSMLR returned HTTP ${res.status}`,
      res.status,
    );
  }
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

export async function getLegacyUploadToken(
  kind: "photo" | "video" | "music",
): Promise<string> {
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
  return data.token as string;
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

export async function createQuotePost(input: LegacyPostInput) {
  return legacyRequest("/savequote", {
    thispost: input.source ?? "",
    blog: input.blogId,
    tags: input.tags,
    title: input.title ?? "",
  });
}

export async function createChatPost(input: LegacyPostInput) {
  return legacyRequest("/savechat", {
    thispost: input.content ?? "",
    blog: input.blogId,
    tags: input.tags,
    title: input.title ?? "",
  });
}

export async function createLinkPost(input: LegacyPostInput) {
  return legacyRequest("/savelink", {
    blog: input.blogId,
    description: input.description ?? "",
    image: input.image ?? "",
    tags: input.tags,
    title: input.title ?? "",
    url: input.url ?? "",
  });
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

export async function createAudioPost(input: LegacyPostInput) {
  return legacyRequest("/saveaudio", {
    comment: textHtml(input.content ?? ""),
    blog: input.blogId,
    tags: input.tags,
  });
}
